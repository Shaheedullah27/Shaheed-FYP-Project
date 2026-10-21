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
