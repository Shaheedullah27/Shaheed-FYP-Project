import sqlite3
import os
import json
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), 'resumematch.db')
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), 'schema.sql')

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    with open(SCHEMA_FILE, 'r') as f:
        conn.executescript(f.read())
    columns = {row['name'] for row in conn.execute('PRAGMA table_info(analyses)')}
    if 'ats_score' not in columns:
        conn.execute('ALTER TABLE analyses ADD COLUMN ats_score REAL')
        conn.execute('''
            UPDATE analyses
            SET ats_score = COALESCE(ats_readability_score, 80.0)
            WHERE ats_score IS NULL
        ''')
    conn.commit()
    
    # Initialize security quarantine & findings tables
    from security_engine.models import init_security_tables
    init_security_tables(conn)
    
    conn.close()

def save_analysis(analysis_data: Dict[str, Any]) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    analysis_id = analysis_data.get('id')
    ats_score = 80.0
    if 'ats_compatibility_report' in analysis_data and isinstance(analysis_data['ats_compatibility_report'], dict):
        ats_score = analysis_data['ats_compatibility_report'].get('atsScore', 80.0)
    elif 'ats_score' in analysis_data:
        ats_score = analysis_data['ats_score']
    elif 'ats_readability_score' in analysis_data:
        ats_score = analysis_data['ats_readability_score']

    cursor.execute('''
        INSERT OR REPLACE INTO analyses (
            id, resume_title, candidate_name, job_title, company_name,
            cosine_similarity, skill_match_score, keyword_density_score,
            ats_readability_score, ats_score, overall_score, word_count_resume, word_count_jd,
            resume_text, job_description_text, analysis_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        analysis_id,
        analysis_data.get('resume_title', 'Resume'),
        analysis_data.get('candidate_name', ''),
        analysis_data.get('job_title', 'Target Role'),
        analysis_data.get('company_name', ''),
        analysis_data.get('cosine_similarity', 0.0),
        analysis_data.get('skill_match_score', 0.0),
        analysis_data.get('keyword_density_score', 0.0),
        analysis_data.get('ats_readability_score', 0.0),
        ats_score,
        analysis_data.get('overall_score', 0.0),
        analysis_data.get('word_count_resume', 0),
        analysis_data.get('word_count_jd', 0),
        analysis_data.get('resume_text', ''),
        analysis_data.get('job_description_text', ''),
        json.dumps(analysis_data)
    ))

    # Save skills cache
    cursor.execute('DELETE FROM skills_cache WHERE analysis_id = ?', (analysis_id,))
    
    all_skills = analysis_data.get('matched_skills', []) + analysis_data.get('missing_skills', [])
    for skill in all_skills:
        cursor.execute('''
            INSERT INTO skills_cache (
                analysis_id, skill_name, category, importance, frequency_in_jd, found_in_resume
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            analysis_id,
            skill.get('name'),
            skill.get('category'),
            skill.get('importance', 'Required'),
            skill.get('frequencyInJD', 1),
            1 if skill.get('foundInResume') else 0
        ))

    conn.commit()
    conn.close()
    return analysis_id

def get_recent_analyses(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, timestamp, resume_title, candidate_name, job_title, company_name,
               overall_score, cosine_similarity, skill_match_score, ats_score, analysis_json
        FROM analyses
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    
    results = []
    for row in rows:
        d = dict(row)
        # Parse analysis_json for extra metrics if needed
        if d.get('analysis_json'):
            try:
                full_obj = json.loads(d['analysis_json'])
                d['matchedSkillCount'] = len(full_obj.get('matched_skills', []))
                d['missingSkillCount'] = len(full_obj.get('missing_skills', []))
                missing = full_obj.get('missing_skills', [])
                d['topMissingSkill'] = missing[0]['name'] if missing else 'None'
            except Exception:
                pass
            del d['analysis_json']
        results.append(d)
    conn.close()
    return results

def get_analysis_by_id(analysis_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT analysis_json FROM analyses WHERE id = ?', (analysis_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row and row['analysis_json']:
        return json.loads(row['analysis_json'])
    return None

def delete_analysis_by_id(analysis_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM analyses WHERE id = ?', (analysis_id,))
    cursor.execute('DELETE FROM skills_cache WHERE analysis_id = ?', (analysis_id,))
    conn.commit()
    conn.close()
    return True

# --- SECURITY ENGINE DATABASE HELPERS ---

def get_security_summary() -> Dict[str, Any]:
    """Computes summary metrics for security dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    total = cursor.execute('SELECT COUNT(*) FROM resume_inspections').fetchone()[0]
    clean = cursor.execute("SELECT COUNT(*) FROM resume_inspections WHERE risk_level = 'CLEAN'").fetchone()[0]
    flagged = cursor.execute("SELECT COUNT(*) FROM resume_inspections WHERE quarantine_status = 'FLAGGED_FOR_REVIEW'").fetchone()[0]
    quarantined = cursor.execute("SELECT COUNT(*) FROM resume_inspections WHERE quarantine_status = 'QUARANTINED'").fetchone()[0]
    crit_high = cursor.execute("SELECT COUNT(*) FROM resume_inspections WHERE risk_level IN ('CRITICAL', 'HIGH')").fetchone()[0]
    incomplete = cursor.execute("SELECT COUNT(*) FROM resume_inspections WHERE inspection_status = 'incomplete'").fetchone()[0]
    
    cursor.execute('''
        SELECT f.id, f.inspection_id, f.rule_id, f.title, f.severity, f.confidence, f.snippet, f.page_number,
               i.filename, i.candidate_name, i.quarantine_status, f.created_at
        FROM security_findings f
        JOIN resume_inspections i ON f.inspection_id = i.id
        WHERE f.severity IN ('CRITICAL', 'HIGH')
        ORDER BY f.created_at DESC
        LIMIT 6
    ''')
    recent_alerts = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "total_inspected": total,
        "clean_count": clean,
        "flagged_count": flagged,
        "quarantined_count": quarantined,
        "critical_high_count": crit_high,
        "incomplete_count": incomplete,
        "recent_alerts": recent_alerts
    }

def get_security_findings_list(
    query: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    reviewer_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """Lists findings with filters and search query."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    conditions = []
    params = []
    
    if query and query.strip():
        q = f"%{query.strip()}%"
        conditions.append("(f.title LIKE ? OR f.description LIKE ? OR f.snippet LIKE ? OR i.filename LIKE ? OR i.candidate_name LIKE ?)")
        params.extend([q, q, q, q, q])
        
    if severity and severity.upper() != 'ALL':
        conditions.append("f.severity = ?")
        params.append(severity.upper())
        
    if category and category.upper() != 'ALL':
        conditions.append("f.category = ?")
        params.append(category)
        
    if reviewer_status and reviewer_status.lower() != 'all':
        conditions.append("f.reviewer_status = ?")
        params.append(reviewer_status.lower())
        
    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    # Count total
    count_sql = f'''
        SELECT COUNT(*) 
        FROM security_findings f
        JOIN resume_inspections i ON f.inspection_id = i.id
        {where_clause}
    '''
    total_count = cursor.execute(count_sql, params).fetchone()[0]
    
    # Fetch rows
    fetch_sql = f'''
        SELECT f.id, f.inspection_id, f.resume_id, f.rule_id, f.category, f.severity, f.confidence,
               f.title, f.description, f.snippet, f.page_number, f.bbox_json, f.font_name,
               f.font_size, f.font_color, f.background_color, f.visibility_evidence,
               f.reviewer_status, f.reviewer_notes, f.created_at,
               i.filename, i.candidate_name, i.job_title, i.quarantine_status, i.risk_level
        FROM security_findings f
        JOIN resume_inspections i ON f.inspection_id = i.id
        {where_clause}
        ORDER BY 
            CASE f.severity 
                WHEN 'CRITICAL' THEN 1 
                WHEN 'HIGH' THEN 2 
                WHEN 'MEDIUM' THEN 3 
                ELSE 4 
            END,
            f.created_at DESC
        LIMIT ? OFFSET ?
    '''
    params.extend([limit, offset])
    cursor.execute(fetch_sql, params)
    rows = cursor.fetchall()
    
    findings = []
    for r in rows:
        d = dict(r)
        if d.get('bbox_json'):
            try:
                d['bbox'] = json.loads(d['bbox_json'])
            except Exception:
                d['bbox'] = []
            del d['bbox_json']
        findings.append(d)
        
    conn.close()
    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "findings": findings
    }

def get_security_finding_by_id(finding_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full details for a single security finding."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT f.*, i.filename, i.candidate_name, i.job_title, i.quarantine_status,
               i.risk_level, i.inspection_status, i.completed_steps_json, i.failed_steps_json
        FROM security_findings f
        JOIN resume_inspections i ON f.inspection_id = i.id
        WHERE f.id = ?
    ''', (finding_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    d = dict(row)
    if d.get('bbox_json'):
        try:
            d['bbox'] = json.loads(d['bbox_json'])
        except Exception:
            d['bbox'] = []
    if d.get('detection_details_json'):
        try:
            d['detection_details'] = json.loads(d['detection_details_json'])
        except Exception:
            d['detection_details'] = {}
    if d.get('completed_steps_json'):
        try:
            d['completed_steps'] = json.loads(d['completed_steps_json'])
        except Exception:
            d['completed_steps'] = []
    if d.get('failed_steps_json'):
        try:
            d['failed_steps'] = json.loads(d['failed_steps_json'])
        except Exception:
            d['failed_steps'] = []
    return d

def get_security_inspections(
    limit: int = 50,
    offset: int = 0,
    quarantine_status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves list of document inspection reports."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where = "WHERE quarantine_status = ?" if quarantine_status and quarantine_status != 'ALL' else ""
    params = [quarantine_status] if where else []
    params.extend([limit, offset])
    
    cursor.execute(f'''
        SELECT * FROM resume_inspections
        {where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ''', params)
    
    rows = [dict(r) for r in cursor.fetchall()]
    for r in rows:
        if r.get('completed_steps_json'):
            try:
                r['completed_steps'] = json.loads(r['completed_steps_json'])
            except Exception:
                r['completed_steps'] = []
        if r.get('failed_steps_json'):
            try:
                r['failed_steps'] = json.loads(r['failed_steps_json'])
            except Exception:
                r['failed_steps'] = []
    conn.close()
    return rows

def get_security_inspection_by_id(inspection_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves inspection and its associated findings."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM resume_inspections WHERE id = ?', (inspection_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    insp = dict(row)
    if insp.get('completed_steps_json'):
        try:
            insp['completed_steps'] = json.loads(insp['completed_steps_json'])
        except Exception:
            insp['completed_steps'] = []
    if insp.get('failed_steps_json'):
        try:
            insp['failed_steps'] = json.loads(insp['failed_steps_json'])
        except Exception:
            insp['failed_steps'] = []
            
    cursor.execute('SELECT * FROM security_findings WHERE inspection_id = ? ORDER BY page_number, id', (inspection_id,))
    insp['findings'] = [dict(f) for f in cursor.fetchall()]
    conn.close()
    return insp

def get_security_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches security audit log records."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM security_audit_log
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_all_security_policies() -> Dict[str, Any]:
    """Retrieves security policy key/values from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT policy_key, policy_value_json FROM security_policies')
    policies = {}
    for row in cursor.fetchall():
        try:
            policies[row['policy_key']] = json.loads(row['policy_value_json'])
        except Exception:
            policies[row['policy_key']] = row['policy_value_json']
    conn.close()
    return policies

