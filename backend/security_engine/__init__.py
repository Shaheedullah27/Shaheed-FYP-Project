"""
AI ResumeMatch Security Engine:
Advanced Resume Manipulation Detection, Hidden Instruction Detection & Security Quarantine.
"""

from .engine import inspect_uploaded_resume
from .pdf_inspector import render_page_with_highlight
from .quarantine_manager import perform_admin_review_action
from .models import init_security_tables, record_audit_log

__all__ = [
    "inspect_uploaded_resume",
    "render_page_with_highlight",
    "perform_admin_review_action",
    "init_security_tables",
    "record_audit_log"
]
