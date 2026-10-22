import sqlite3
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional, Tuple

DEFAULT_POLICIES = {
    "min_visible_font_size_pt": 3.5,
    "off_page_margin_tolerance_pt": 2.0,
    "white_text_luminance_threshold": 0.92,
    "background_light_threshold": 0.90,
    "max_docx_uncompressed_bytes": 50 * 1024 * 1024,  # 50 MB zip bomb limit
    "max_docx_compression_ratio": 25.0,
    "quarantine_on_critical": True,
    "quarantine_on_high_confidence_prompt_injection": True,
    "flag_on_incomplete_ocr": True,
    "require_reason_for_clear": True,
    "conservative_incomplete_policy": "FLAGGED_FOR_REVIEW"
}

def init_security_tables(conn: sqlite3.Connection):
    """Initializes SQLite schema for security quarantine, findings, and audit logs."""
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS resume_inspections (
        id TEXT PRIMARY KEY,
        resume_id TEXT,
        filename TEXT NOT NULL,
        file_type TEXT,
        candidate_name TEXT,
        job_title TEXT,
        inspection_status TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        quarantine_status TEXT NOT NULL,
        total_findings INTEGER DEFAULT 0,
        critical_findings INTEGER DEFAULT 0,
        high_findings INTEGER DEFAULT 0,
        medium_findings INTEGER DEFAULT 0,
        low_findings INTEGER DEFAULT 0,
        completed_steps_json TEXT,
        failed_steps_json TEXT,
        summary_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS security_findings (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        resume_id TEXT,
        rule_id TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        snippet TEXT,
        page_number INTEGER,
        bbox_json TEXT,
        font_name TEXT,
        font_size REAL,
        font_color TEXT,
        background_color TEXT,
        visibility_evidence TEXT,
        detection_details_json TEXT,
        reviewer_status TEXT DEFAULT 'unreviewed',
        reviewer_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(inspection_id) REFERENCES resume_inspections(id) ON DELETE CASCADE
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS security_quarantine (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        resume_id TEXT,
        status TEXT NOT NULL,
        reason TEXT NOT NULL,
        quarantined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by TEXT,
        review_reason TEXT,
        FOREIGN KEY(inspection_id) REFERENCES resume_inspections(id) ON DELETE CASCADE
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS security_audit_log (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT,
        details_json TEXT
    );
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS security_policies (
        policy_key TEXT PRIMARY KEY,
        policy_value_json TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ''')

    # Create helpful indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_inspections_created ON resume_inspections(created_at DESC);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_inspections_quarantine ON resume_inspections(quarantine_status);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_findings_inspection ON security_findings(inspection_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_findings_severity ON security_findings(severity);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_log(timestamp DESC);')

    # Seed default policies if missing
    for k, v in DEFAULT_POLICIES.items():
        cursor.execute('''
            INSERT OR IGNORE INTO security_policies (policy_key, policy_value_json)
            VALUES (?, ?)
        ''', (k, json.dumps(v)))

    conn.commit()

def record_audit_log(
    conn: sqlite3.Connection,
    actor: str,
    action: str,
    target_type: str,
    target_id: str,
    reason: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> str:
    """Safely records an immutable audit log entry."""
    audit_id = f"audit-{uuid.uuid4().hex[:12]}"
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO security_audit_log (id, actor, action, target_type, target_id, reason, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        audit_id,
        actor or "system",
        action,
        target_type,
        target_id,
        reason or "",
        json.dumps(details or {})
    ))
    return audit_id

def save_full_inspection(
    conn: sqlite3.Connection,
    inspection_data: Dict[str, Any],
    findings: List[Dict[str, Any]],
    actor: str = "security_engine"
) -> str:
    """
    Saves or replaces a full resume inspection report, its findings,
    initial quarantine state, and creates audit log entries within a transaction.
    """
    cursor = conn.cursor()
    inspection_id = inspection_data.get('id') or f"insp-{uuid.uuid4().hex[:12]}"
    
    # Calculate counts
    sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in findings:
        sev = f.get('severity', 'LOW').upper()
        if sev in sev_counts:
            sev_counts[sev] += 1

    cursor.execute('''
        INSERT OR REPLACE INTO resume_inspections (
            id, resume_id, filename, file_type, candidate_name, job_title,
            inspection_status, risk_level, quarantine_status,
            total_findings, critical_findings, high_findings, medium_findings, low_findings,
            completed_steps_json, failed_steps_json, summary_notes,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ''', (
        inspection_id,
        inspection_data.get('resume_id'),
        inspection_data.get('filename', 'Unknown'),
        inspection_data.get('file_type', 'unknown'),
        inspection_data.get('candidate_name', ''),
        inspection_data.get('job_title', ''),
        inspection_data.get('inspection_status', 'completed'),
        inspection_data.get('risk_level', 'CLEAN'),
        inspection_data.get('quarantine_status', 'NOT_QUARANTINED'),
        len(findings),
        sev_counts["CRITICAL"],
        sev_counts["HIGH"],
        sev_counts["MEDIUM"],
        sev_counts["LOW"],
        json.dumps(inspection_data.get('completed_steps', [])),
        json.dumps(inspection_data.get('failed_steps', [])),
        inspection_data.get('summary_notes', '')
    ))

    # Clear prior findings if re-inspecting
    cursor.execute('DELETE FROM security_findings WHERE inspection_id = ?', (inspection_id,))

    for f in findings:
        finding_id = f.get('id') or f"find-{uuid.uuid4().hex[:12]}"
        cursor.execute('''
            INSERT INTO security_findings (
                id, inspection_id, resume_id, rule_id, category, severity, confidence,
                title, description, snippet, page_number, bbox_json,
                font_name, font_size, font_color, background_color, visibility_evidence,
                detection_details_json, reviewer_status, reviewer_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            finding_id,
            inspection_id,
            f.get('resume_id') or inspection_data.get('resume_id'),
            f.get('rule_id', 'RULE_UNKNOWN'),
            f.get('category', 'ANOMALY'),
            f.get('severity', 'LOW'),
            f.get('confidence', 'MEDIUM'),
            f.get('title', 'Security Finding'),
            f.get('description', ''),
            f.get('snippet', ''),
            f.get('page_number', 1),
            json.dumps(f.get('bbox', [])),
            f.get('font_name', ''),
            f.get('font_size', 0.0),
            f.get('font_color', ''),
            f.get('background_color', ''),
            f.get('visibility_evidence', ''),
            json.dumps(f.get('detection_details', {})),
            f.get('reviewer_status', 'unreviewed'),
            f.get('reviewer_notes', '')
        ))

    # Record quarantine record if quarantined or flagged
    q_status = inspection_data.get('quarantine_status', 'NOT_QUARANTINED')
    if q_status in ('QUARANTINED', 'FLAGGED_FOR_REVIEW'):
        q_id = f"quar-{uuid.uuid4().hex[:12]}"
        cursor.execute('''
            INSERT OR REPLACE INTO security_quarantine (
                id, inspection_id, resume_id, status, reason, quarantined_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ''', (
            q_id,
            inspection_id,
            inspection_data.get('resume_id'),
            q_status,
            inspection_data.get('quarantine_reason', 'Automated security heuristic trigger')
        ))

    # Audit log
    record_audit_log(
        conn,
        actor=actor,
        action="INSPECTION_COMPLETED" if inspection_data.get('inspection_status') == 'completed' else "INSPECTION_FLAGGED",
        target_type="INSPECTION",
        target_id=inspection_id,
        reason=f"Risk: {inspection_data.get('risk_level')}, Status: {q_status}, Findings: {len(findings)}",
        details={
            "filename": inspection_data.get('filename'),
            "findings_count": len(findings),
            "risk_level": inspection_data.get('risk_level'),
            "quarantine_status": q_status
        }
    )

    return inspection_id
