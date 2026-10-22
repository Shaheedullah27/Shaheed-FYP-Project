import re
from typing import List, Dict, Any, Optional, Tuple

# Core regex patterns for screening manipulation instructions
# We normalize whitespace and casing before matching.

INJECTION_PATTERNS = [
    {
        "id": "RULE_SYSTEM_PROMPT_OVERRIDE",
        "category": "INSTRUCTION_INJECTION",
        "title": "System Prompt Override / Instruction Injection",
        "description": "Text attempts to command the automated screening system to disregard previous instructions or system prompts.",
        "patterns": [
            r"\bignore\s+(all\s+)?(previous|prior|above|system)\s+instructions\b",
            r"\bdisregard\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|directives)\b",
            r"\bforget\s+(all\s+)?(previous|prior)\s+(instructions|rules)\b",
            r"\boverride\s+(the\s+)?(system\s+prompt|screening\s+instructions|screening\s+rules)\b",
            r"\bbypass\s+(all\s+)?(safety\s+filters|screening\s+instructions|the\s+normal\s+screening\s+process)\b",
            r"\breset\s+instructions\s+and\b"
        ],
        "base_severity": "HIGH",
        "base_confidence": "HIGH"
    },
    {
        "id": "RULE_SCORING_MANIPULATION",
        "category": "SCORING_TAMPERING",
        "title": "Automated Scoring Manipulation Directive",
        "description": "Text attempts to command the automated screening system to award full score or maximum points.",
        "patterns": [
            r"\bgive\s+(this\s+)?(resume|candidate|applicant)\s+(a\s+)?(score\s+of\s+100|highest\s+score|maximum\s+score|perfect\s+score|100%)\b",
            r"\bassign\s+(a\s+)?(score\s+of\s+100|100%|maximum\s+points|full\s+marks)\s+(to\s+this\s+candidate|to\s+this\s+resume)?\b",
            r"\bset\s+(the\s+)?(overall\s+score|match\s+score|ats\s+score)\s+(to\s+100|to\s+maximum)\b",
            r"\brate\s+(this\s+)?(candidate|resume)\s+(as\s+)?(100%|highest|top\s+tier)\s+match\b",
            r"\bchange\s+(the\s+)?scoring\s+weights\b"
        ],
        "base_severity": "HIGH",
        "base_confidence": "HIGH"
    },
    {
        "id": "RULE_RANKING_SHORTLIST_MANIPULATION",
        "category": "SELECTION_TAMPERING",
        "title": "Shortlist / Candidate Ranking Directive",
        "description": "Text attempts to command automated selection, shortlisting, or priority ranking over other candidates.",
        "patterns": [
            r"\bselect\s+this\s+candidate\s+(automatically|immediately|without\s+evaluation)\b",
            r"\balways\s+rank\s+this\s+(applicant|candidate)\s+first\b",
            r"\badd\s+this\s+(applicant|candidate)\s+to\s+(the\s+)?shortlist\s+immediately\b",
            r"\bdo\s+not\s+evaluate\s+(the\s+)?other\s+candidates\b",
            r"\bforce\s+(select|shortlist|hire)\s+this\s+candidate\b",
            r"\bauto-select\s+this\s+(applicant|resume)\b"
        ],
        "base_severity": "HIGH",
        "base_confidence": "HIGH"
    },
    {
        "id": "RULE_REQUIREMENT_OVERRIDE",
        "category": "REQUIREMENT_BYPASS",
        "title": "Qualification & Job Requirement Bypass",
        "description": "Text attempts to command the screening system to bypass missing skills or treat mandatory requirements as fulfilled.",
        "patterns": [
            r"\boverride\s+(the\s+)?job\s+requirements\b",
            r"\bignore\s+(all\s+)?missing\s+qualifications\b",
            r"\bmark\s+all\s+(mandatory\s+)?requirements\s+as\s+satisfied\b",
            r"\bconsider\s+all\s+prerequisites\s+(as\s+)?met\b",
            r"\bbypass\s+(the\s+)?qualification\s+check\b"
        ],
        "base_severity": "HIGH",
        "base_confidence": "HIGH"
    },
    {
        "id": "RULE_EVASION_DIRECTIVE",
        "category": "DETECTION_EVASION",
        "title": "Evasion & Secrecy Directive",
        "description": "Text attempts to instruct the screening engine not to alert recruiters or administrators.",
        "patterns": [
            r"\bdo\s+not\s+report\s+this\s+instruction\s+(to\s+the\s+administrator|to\s+the\s+recruiter|to\s+anyone)\b",
            r"\bhide\s+this\s+(message|prompt|instruction)\s+from\s+(the\s+)?(admin|recruiter|reviewer)\b",
            r"\bdo\s+not\s+flag\s+this\s+(resume|candidate)\b",
            r"\bkeep\s+this\s+(instruction|prompt)\s+secret\b"
        ],
        "base_severity": "HIGH",
        "base_confidence": "HIGH"
    }
]

# Context patterns indicating legitimate research, coursework, or cybersecurity work
LEGITIMATE_CONTEXT_PATTERNS = [
    r"\bresearch(ed|ing)?\s+.*(prompt\s+injection|jailbreak|adversarial|vulnerabilit)",
    r"\bstud(ied|ying)\s+.*(prompt\s+injection|llm\s+security|model\s+security)",
    r"\bbenchmark(ed|ing)?\s+.*(adversarial\s+prompt|prompt\s+injection|robustness)",
    r"\bpublish(ed)?\s+.*(paper|article|findings|thesis)\s+on\s+.*(prompt\s+injection|ai\s+safety)",
    r"\bdefen(se|ded|ding)\s+against\s+(prompt\s+injection|jailbreaks)",
    r"\bpen(etration)?\s+test(ing|ed)?\s+.*(llm|ai|chatbot|prompt)",
    r"\bsecurity\s+(researcher|analyst|engineer|consultant)\b",
    r"\bred\s+team(ing)?\b"
]

def check_legitimate_security_context(full_text: str, match_pos: int, window: int = 250) -> Tuple[bool, str]:
    """
    Checks if the suspicious phrase appears within a legitimate security
    research, coursework, or penetration testing context in the resume.
    """
    start = max(0, match_pos - window)
    end = min(len(full_text), match_pos + window)
    surrounding = full_text[start:end].lower()

    for pat in LEGITIMATE_CONTEXT_PATTERNS:
        m = re.search(pat, surrounding, re.IGNORECASE)
        if m:
            return True, f"Found legitimate security context: '{m.group(0)}'"

    return False, ""

def detect_screening_manipulation_instructions(
    text: str,
    is_concealed: bool = False,
    page_number: int = 1,
    bbox: Optional[List[float]] = None,
    formatting_info: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Scans text for screening manipulation instructions with heuristic pattern matching,
    contextual disambiguation, and explainable scoring.
    """
    if not text or not text.strip():
        return []

    findings = []
    normalized_text = text.replace('\r', ' ').replace('\n', ' ')

    for rule in INJECTION_PATTERNS:
        for pat in rule["patterns"]:
            matches = list(re.finditer(pat, normalized_text, re.IGNORECASE))
            for match in matches:
                matched_snippet = match.group(0)
                pos = match.start()

                # Extract surrounding context snippet (up to 80 chars before and after)
                snippet_start = max(0, pos - 60)
                snippet_end = min(len(normalized_text), pos + len(matched_snippet) + 60)
                context_snippet = normalized_text[snippet_start:snippet_end].strip()

                is_legit, legit_reason = check_legitimate_security_context(normalized_text, pos)

                # Determine severity and confidence
                if is_legit:
                    # Legitimate research reference discussed (even if formatted atypically)
                    severity = "LOW"
                    confidence = "LOW"
                    desc = f"{rule['description']} Note: Identified as legitimate security research/engineering context: {legit_reason}."
                elif is_concealed:
                    # Concealed instruction is severe manipulation
                    severity = "CRITICAL"
                    confidence = "VERIFIED"
                    desc = f"{rule['description']} (Concealed inside document formatting/layout)."
                else:
                    # Visible instruction statement
                    severity = "MEDIUM"
                    confidence = "HIGH"
                    desc = f"{rule['description']} (Visible in document text; not concealed)."

                finding = {
                    "rule_id": rule["id"],
                    "category": rule["category"],
                    "severity": severity,
                    "confidence": confidence,
                    "title": rule["title"],
                    "description": desc,
                    "snippet": context_snippet,
                    "page_number": page_number,
                    "bbox": bbox or [],
                    "font_name": formatting_info.get("font_name", "") if formatting_info else "",
                    "font_size": formatting_info.get("font_size", 0.0) if formatting_info else 0.0,
                    "font_color": formatting_info.get("font_color", "") if formatting_info else "",
                    "background_color": formatting_info.get("background_color", "") if formatting_info else "",
                    "visibility_evidence": "Concealed/Invisible text" if is_concealed else "Visible document text",
                    "detection_details": {
                        "matched_phrase": matched_snippet,
                        "regex_pattern": pat,
                        "is_concealed": is_concealed,
                        "is_legitimate_context": is_legit,
                        "legitimate_reason": legit_reason,
                        "formatting_info": formatting_info or {}
                    }
                }
                findings.append(finding)

    return findings
