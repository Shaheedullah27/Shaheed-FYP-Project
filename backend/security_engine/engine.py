import os
import uuid
from typing import Dict, Any, List, Optional
from .pdf_inspector import inspect_pdf_document, render_page_with_highlight
from .docx_inspector import inspect_docx_document
from .ocr_inspector import inspect_image_and_ocr, is_tesseract_available
from .discrepancy_analyzer import analyze_document_discrepancies
from .instruction_detector import detect_screening_manipulation_instructions
from .quarantine_manager import determine_quarantine_decision, perform_admin_review_action
from .models import (
    save_full_inspection,
    record_audit_log,
    init_security_tables
)

def inspect_uploaded_resume(
    conn,
    file_bytes: bytes,
    filename: str,
    resume_id: Optional[str] = None,
    candidate_name: Optional[str] = None,
    job_title: Optional[str] = None,
    mock_ocr_text: Optional[str] = None,
    actor: str = "security_engine"
) -> Dict[str, Any]:
    """
    Unified multi-layer security inspection pipeline for uploaded resumes.
    Inspects formatting, hidden text, micro-fonts, off-page coordinates,
    document metadata, active content, embedded images/OCR, and prompt injection.
    Persists findings to SQLite and evaluates automated quarantine policies.
    """
    ext = os.path.splitext(filename)[1].lower()
    inspection_id = f"insp-{uuid.uuid4().hex[:12]}"
    
    findings: List[Dict[str, Any]] = []
    completed_steps: List[str] = []
    failed_steps: List[str] = []
    inspection_status = "completed"
    stats: Dict[str, Any] = {}

    # Step 1: Document Structure & Formatting Inspection
    if ext == ".pdf":
        file_type = "pdf"
        pdf_findings, pdf_stats = inspect_pdf_document(file_bytes, filename)
        findings.extend(pdf_findings)
        completed_steps.extend(pdf_stats.get("completed_steps", []))
        failed_steps.extend(pdf_stats.get("failed_steps", []))
        if pdf_stats.get("inspection_status") == "failed":
            inspection_status = "failed"
        stats.update(pdf_stats)

        # OCR & Image Inspection
        ocr_findings, ocr_stats = inspect_image_and_ocr(
            file_bytes=file_bytes,
            file_type="pdf",
            extracted_plain_text="",
            mock_ocr_text=mock_ocr_text
        )
        findings.extend(ocr_findings)
        if ocr_stats.get("is_incomplete"):
            inspection_status = "incomplete"
            failed_steps.append("image_and_ocr_inspection")
        else:
            completed_steps.append("image_and_ocr_inspection")

    elif ext in [".docx", ".doc"]:
        file_type = "docx"
        docx_findings, docx_stats = inspect_docx_document(file_bytes, filename)
        findings.extend(docx_findings)
        completed_steps.extend(docx_stats.get("completed_steps", []))
        failed_steps.extend(docx_stats.get("failed_steps", []))
        if docx_stats.get("inspection_status") == "failed":
            inspection_status = "failed"
        stats.update(docx_stats)

        ocr_findings, ocr_stats = inspect_image_and_ocr(
            file_bytes=file_bytes,
            file_type="docx",
            extracted_plain_text="",
            mock_ocr_text=mock_ocr_text
        )
        findings.extend(ocr_findings)
        if ocr_stats.get("is_incomplete"):
            inspection_status = "incomplete"
            failed_steps.append("image_and_ocr_inspection")
        else:
            completed_steps.append("image_and_ocr_inspection")

    elif ext in [".txt", ".md", ".rtf"]:
        file_type = "text"
        completed_steps.append("text_extraction")
        try:
            txt = file_bytes.decode("utf-8", errors="ignore")
            txt_findings = detect_screening_manipulation_instructions(txt, is_concealed=False)
            findings.extend(txt_findings)
            completed_steps.append("instruction_detection")
        except Exception as e:
            failed_steps.append("text_extraction")
            inspection_status = "failed"
    else:
        file_type = "unsupported"
        failed_steps.append("unsupported_extension")
        inspection_status = "failed"

    # Deduplicate findings by rule_id + snippet
    unique_findings = []
    seen = set()
    for f in findings:
        key = (f.get("rule_id"), f.get("snippet", "")[:60], f.get("page_number", 1))
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)

    # Determine automated quarantine policy decision
    stats["inspection_status"] = inspection_status
    stats["completed_steps"] = list(dict.fromkeys(completed_steps))
    stats["failed_steps"] = list(dict.fromkeys(failed_steps))

    risk_level, quarantine_status, summary_notes = determine_quarantine_decision(
        unique_findings,
        stats
    )

    # Calculate counts
    sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in unique_findings:
        sev = f.get('severity', 'LOW').upper()
        if sev in sev_counts:
            sev_counts[sev] += 1

    inspection_record = {
        "id": inspection_id,
        "resume_id": resume_id or f"res-{uuid.uuid4().hex[:10]}",
        "filename": filename,
        "file_type": file_type,
        "candidate_name": candidate_name or "",
        "job_title": job_title or "",
        "inspection_status": inspection_status,
        "risk_level": risk_level,
        "quarantine_status": quarantine_status,
        "quarantine_reason": summary_notes,
        "total_findings": len(unique_findings),
        "critical_findings": sev_counts["CRITICAL"],
        "high_findings": sev_counts["HIGH"],
        "medium_findings": sev_counts["MEDIUM"],
        "low_findings": sev_counts["LOW"],
        "completed_steps": stats["completed_steps"],
        "failed_steps": stats["failed_steps"],
        "summary_notes": summary_notes
    }

    # Persist in SQLite
    save_full_inspection(conn, inspection_record, unique_findings, actor=actor)

    inspection_record["findings"] = unique_findings
    return inspection_record
