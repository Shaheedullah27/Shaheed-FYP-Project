import re
from typing import List, Dict, Any, Optional

def normalize_text_tokens(text: str) -> List[str]:
    """Tokenizes text ignoring punctuation and normal case variations."""
    clean = re.sub(r"[^\w\s]", " ", text.lower())
    return [w for w in clean.split() if len(w) > 1]

def analyze_document_discrepancies(
    stream_text: str,
    visible_spans_text: str,
    ocr_text: Optional[str] = None,
    page_number: int = 1
) -> List[Dict[str, Any]]:
    """
    Compares internal text stream with visible text rendered on pages and OCR output.
    Tolerates ordinary discrepancies (multi-column reading order, hyphenation, ligatures).
    Labels ambiguous discrepancies as 'Inconclusive' rather than falsely confirming hidden text.
    """
    findings = []
    
    stream_tokens = normalize_text_tokens(stream_text)
    visible_tokens = normalize_text_tokens(visible_spans_text)
    
    stream_set = set(stream_tokens)
    visible_set = set(visible_tokens)
    
    # Text present in internal stream but missing from visible spans
    missing_from_visible = stream_set - visible_set
    
    # Filter out common punctuation/ligature artifacts
    legit_artifacts = {"fi", "fl", "ff", "ffi", "ffl", "th", "ae", "oe"}
    meaningful_missing = [w for w in missing_from_visible if len(w) > 3 and w not in legit_artifacts]
    
    if len(meaningful_missing) > 15:
        # Check if the missing words contain suspicious instructions
        missing_text = " ".join(meaningful_missing)
        is_suspicious_words = any(
            w in missing_text.lower()
            for w in ["ignore", "instructions", "score", "rank", "shortlist", "override", "bypass"]
        )
        
        severity = "HIGH" if is_suspicious_words else "LOW"
        confidence = "HIGH" if is_suspicious_words else "LOW"
        
        findings.append({
            "rule_id": "RULE_STREAM_VISIBLE_DISCREPANCY",
            "category": "DISCREPANCY",
            "severity": severity,
            "confidence": confidence,
            "title": "Discrepancy Between Internal Stream and Visible Page Layout",
            "description": (
                "Document contains internal text content that was not detected in visible layout spans. "
                + ("Suspicious keywords detected in unrendered stream." if is_suspicious_words else "Likely caused by complex formatting, ligature substitutions, or multi-column layout (Inconclusive).")
            ),
            "snippet": f"Unrendered tokens sample: {', '.join(meaningful_missing[:8])}...",
            "page_number": page_number,
            "bbox": [],
            "visibility_evidence": "Internal document stream discrepancy (Inconclusive visibility)",
            "detection_details": {
                "missing_tokens_count": len(meaningful_missing),
                "is_inconclusive": not is_suspicious_words
            }
        })
        
    return findings
