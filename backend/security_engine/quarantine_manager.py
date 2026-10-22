import sqlite3
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional, Tuple
from .models import record_audit_log

def determine_quarantine_decision(
    findings: List[Dict[str, Any]],
    inspection_stats: Dict[str, Any],
    policies: Optional[Dict[str, Any]] = None
) -> Tuple[str, str, str]:
    """
    Evaluates findings against security policies to determine risk level,
    quarantine status, and explainable summary notes.
    
    Returns: (risk_level, quarantine_status, summary_notes)
    Risk levels: CLEAN, LOW, MEDIUM, HIGH, CRITICAL
    Quarantine statuses: NOT_QUARANTINED, FLAGGED_FOR_REVIEW, QUARANTINED
    """
    p = policies or {}
    quarantine_on_crit = p.get("quarantine_on_critical", True)
    quarantine_on_prompt_inj = p.get("quarantine_on_high_confidence_prompt_injection", True)
    conservative_incomplete = p.get("conservative_incomplete_policy", "FLAGGED_FOR_REVIEW")

    crit_findings = [f for f in findings if f.get("severity") == "CRITICAL"]
    high_findings = [f for f in findings if f.get("severity") == "HIGH"]
    med_findings = [f for f in findings if f.get("severity") == "MEDIUM"]
    low_findings = [f for f in findings if f.get("severity") == "LOW"]

    # Check for incomplete inspection steps
    is_incomplete = inspection_stats.get("inspection_status") == "incomplete" or len(inspection_stats.get("failed_steps", [])) > 0
    incomplete_warning = inspection_stats.get("warning") or (
        "Inspection could not be fully completed for all layers." if is_incomplete else None
    )

    # Condition A & B: Critical indicators or high-confidence concealed prompt injection
    has_concealed_prompt_injection = any(
        "PROMPT_INJECTION" in f.get("rule_id", "") and f.get("confidence") in ("HIGH", "VERIFIED")
        for f in findings
    )

    if crit_findings or (has_concealed_prompt_injection and quarantine_on_prompt_inj):
        risk_level = "CRITICAL"
        quarantine_status = "QUARANTINED" if quarantine_on_crit else "FLAGGED_FOR_REVIEW"
        notes = (
            f"Quarantined for Security Review. Detected {len(crit_findings)} critical indicator(s) including "
            f"high-confidence concealed screening manipulation instructions."
        )
        return risk_level, quarantine_status, notes

    # Condition B: Multiple corroborating high-severity findings
    if len(high_findings) >= 2:
        risk_level = "CRITICAL"
        quarantine_status = "QUARANTINED"
        notes = (
            f"Quarantined for Security Review. Detected multiple corroborating high-severity findings "
            f"({len(high_findings)} findings) indicating deliberate document manipulation."
        )
        return risk_level, quarantine_status, notes

    # Condition C: Single high finding or multiple medium findings
    if len(high_findings) == 1:
        risk_level = "HIGH"
        quarantine_status = "FLAGGED_FOR_REVIEW"
        notes = f"Flagged for Security Review. Detected 1 high-severity finding: {high_findings[0].get('title')}."
        return risk_level, quarantine_status, notes

    if len(med_findings) >= 1:
        risk_level = "MEDIUM"
        quarantine_status = "FLAGGED_FOR_REVIEW"
        notes = f"Flagged for Security Review. Detected {len(med_findings)} medium-severity anomaly/anomalies requiring reviewer verification."
        return risk_level, quarantine_status, notes

    # Condition D: Incomplete inspection
    if is_incomplete:
        risk_level = "MEDIUM"
        quarantine_status = conservative_incomplete
        notes = f"Security inspection incomplete. {incomplete_warning}"
        return risk_level, quarantine_status, notes

    # Condition E: Low findings only or Clean
    if len(low_findings) > 0:
        risk_level = "LOW"
        quarantine_status = "NOT_QUARANTINED"
        notes = f"Minor formatting anomalies detected ({len(low_findings)} low-severity finding(s)). Document cleared for normal evaluation."
        return risk_level, quarantine_status, notes

    return "CLEAN", "NOT_QUARANTINED", "Document inspected through all security layers with no manipulation indicators detected."

def perform_admin_review_action(
    conn: sqlite3.Connection,
    action: str,  # 'under_review', 'confirm', 'false_positive', 'clear', 'release', 'reject', 'add_note'
    target_id: str,  # inspection_id or finding_id
    actor: str,
    reason: str,
    reviewer_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes an administrative review action with strict audit logging,
    status updating, and reason enforcement.
    """
    if not actor or not actor.strip():
        raise ValueError("Authorized reviewer identity is required.")
        
    if action in ('clear', 'release', 'reject', 'false_positive') and (not reason or len(reason.strip()) < 5):
        raise ValueError("A substantive review reason (at least 5 characters) is required for consequential security actions.")

    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Check if target is finding or inspection
    cursor.execute('SELECT id, inspection_id, reviewer_status FROM security_findings WHERE id = ?', (target_id,))
    finding_row = cursor.fetchone()

    if finding_row:
        # Action on single finding
        finding_id = finding_row['id']
        insp_id = finding_row['inspection_id']

        new_status = 'under_review'
        if action == 'confirm':
            new_status = 'confirmed'
        elif action == 'false_positive':
            new_status = 'false_positive'
        elif action == 'clear':
            new_status = 'cleared'
        elif action == 'under_review':
            new_status = 'under_review'

        note_entry = f"[{now_str}] {actor}: {reason}"
        if reviewer_notes:
            note_entry += f" | Notes: {reviewer_notes}"

        cursor.execute('''
            UPDATE security_findings
            SET reviewer_status = ?,
                reviewer_notes = CASE 
                    WHEN reviewer_notes IS NULL OR reviewer_notes = '' THEN ?
                    ELSE reviewer_notes || '\n' || ?
                END
            WHERE id = ?
        ''', (new_status, note_entry, note_entry, finding_id))

        record_audit_log(
            conn,
            actor=actor,
            action=f"FINDING_{action.upper()}",
            target_type="FINDING",
            target_id=finding_id,
            reason=reason,
            details={"new_status": new_status, "inspection_id": insp_id, "notes": reviewer_notes}
        )

        conn.commit()
        return {
            "success": True,
            "target_type": "FINDING",
            "target_id": finding_id,
            "new_status": new_status,
            "message": f"Finding marked as {new_status}."
        }

    # Otherwise treat target as inspection
    cursor.execute('SELECT id, quarantine_status, risk_level, resume_id FROM resume_inspections WHERE id = ?', (target_id,))
    insp_row = cursor.fetchone()
    if not insp_row:
        raise ValueError(f"Target record '{target_id}' not found.")

    insp_id = insp_row['id']
    old_q_status = insp_row['quarantine_status']
    resume_id = insp_row['resume_id']

    new_q_status = old_q_status
    if action == 'release':
        new_q_status = 'CLEARED'
    elif action == 'clear':
        new_q_status = 'CLEARED'
    elif action == 'reject':
        new_q_status = 'REJECTED'
    elif action == 'under_review':
        new_q_status = 'FLAGGED_FOR_REVIEW'

    cursor.execute('''
        UPDATE resume_inspections
        SET quarantine_status = ?,
            summary_notes = summary_notes || '\n' || ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_q_status, f"[{now_str}] Action '{action}' by {actor}: {reason}", insp_id))

    # Update or insert security_quarantine record
    cursor.execute('''
        INSERT OR REPLACE INTO security_quarantine (
            id, inspection_id, resume_id, status, reason, quarantined_at, updated_at, reviewed_by, review_reason
        ) VALUES (
            COALESCE((SELECT id FROM security_quarantine WHERE inspection_id = ?), ?),
            ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?
        )
    ''', (
        insp_id, f"quar-{uuid.uuid4().hex[:12]}",
        insp_id, resume_id, new_q_status, reason, actor, reason
    ))

    record_audit_log(
        conn,
        actor=actor,
        action=f"INSPECTION_{action.upper()}",
        target_type="INSPECTION",
        target_id=insp_id,
        reason=reason,
        details={
            "old_quarantine_status": old_q_status,
            "new_quarantine_status": new_q_status,
            "resume_id": resume_id
        }
    )

    conn.commit()
    return {
        "success": True,
        "target_type": "INSPECTION",
        "target_id": insp_id,
        "old_status": old_q_status,
        "new_status": new_q_status,
        "message": f"Resume inspection status updated to {new_q_status}."
    }
