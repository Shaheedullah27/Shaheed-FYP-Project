import re
from typing import Dict, Any, List

def evaluate_ats_compatibility(resume_text: str, jd_text: str = "", missing_skills: List[str] = None) -> Dict[str, Any]:
    """
    Evaluates a resume text for Applicant Tracking System (ATS) compatibility
    including text extraction quality, contact info, standard section headers,
    formatting risks, and job description alignment.
    """
    if missing_skills is None:
        missing_skills = []

    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    words = resume_text.strip().split()
    lower_text = resume_text.lower()

    word_count = len(words)
    char_count = len(resume_text)
    is_extractable = word_count >= 30

    single_word_lines = len([l for l in lines if len(l.split()) == 1])
    potential_misordering = len(lines) > 20 and (single_word_lines / len(lines)) > 0.45

    checks = []

    # 1. Text Extraction
    if word_count < 30:
        checks.append({
            'id': 'chk-extraction-empty',
            'category': 'text_extraction',
            'title': 'Text Extraction Sufficiency',
            'status': 'fail',
            'verificationLevel': 'verified',
            'message': 'Extracted text is too short (< 30 words). File may be empty, corrupt, or an image-only scan.',
            'details': f'Extracted {word_count} words.',
            'recommendation': 'Upload a document containing real text streams rather than flattened images.'
        })
    elif potential_misordering:
        checks.append({
            'id': 'chk-extraction-order',
            'category': 'text_extraction',
            'title': 'Text Extraction & Reading Order',
            'status': 'warning',
            'verificationLevel': 'approximate',
            'message': 'Potential multi-column fragmentation detected. Reading order may be vertical instead of horizontal.',
            'details': f'{single_word_lines} of {len(lines)} lines have single words.',
            'recommendation': 'Use a clean single-column layout.'
        })
    else:
        checks.append({
            'id': 'chk-extraction-pass',
            'category': 'text_extraction',
            'title': 'Text Extractability',
            'status': 'pass',
            'verificationLevel': 'verified',
            'message': 'Text parsed cleanly without stream corruption.',
            'details': f'{word_count} words across {len(lines)} lines.'
        })

    # 2. Contact Details
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', resume_text)
    email_found = bool(email_match)
    email_address = email_match.group(0) if email_match else None

    phone_match = re.search(r'(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*(?:[.-]\s*)?([0-9]{4})', resume_text)
    phone_found = bool(phone_match)
    phone_number = phone_match.group(0) if phone_match else None

    linkedin_found = bool(re.search(r'linkedin\.com\/in\/', resume_text, re.I) or 'linkedin' in lower_text)

    if email_found and phone_found:
        checks.append({
            'id': 'chk-contact-core',
            'category': 'contact_info',
            'title': 'Essential Contact Details',
            'status': 'pass',
            'verificationLevel': 'verified',
            'message': 'Both email and phone number are present in accessible text.',
            'details': f'Email: {email_address} | Phone: {phone_number}'
        })
    else:
        missing_parts = []
        if not email_found: missing_parts.append('Email')
        if not phone_found: missing_parts.append('Phone')
        checks.append({
            'id': 'chk-contact-missing',
            'category': 'contact_info',
            'title': 'Essential Contact Details',
            'status': 'fail',
            'verificationLevel': 'verified',
            'message': f"Missing essential contact details: {', '.join(missing_parts)}.",
            'recommendation': 'Include email and phone number at the top of the resume in standard text body.'
        })

    # 3. Standard Sections
    sections_config = [
        {'name': 'Summary / Profile', 'aliases': ['summary', 'profile', 'about me', 'objective'], 'optional_student': True},
        {'name': 'Technical Skills', 'aliases': ['skills', 'technical skills', 'competencies', 'technologies'], 'optional_student': False},
        {'name': 'Work Experience', 'aliases': ['experience', 'work experience', 'employment history'], 'optional_student': True},
        {'name': 'Education', 'aliases': ['education', 'academic background', 'degrees'], 'optional_student': False},
        {'name': 'Projects', 'aliases': ['projects', 'key projects', 'academic projects'], 'optional_student': False},
        {'name': 'Certifications', 'aliases': ['certifications', 'licenses', 'certificates'], 'optional_student': True}
    ]

    detected_sections = []
    detected_count = 0

    has_projects = any('project' in l.lower() for l in lines)
    has_education = any('education' in l.lower() or 'degree' in l.lower() or 'bachelor' in l.lower() for l in lines)

    for sec in sections_config:
        found = False
        for line in lines:
            if len(line.split()) <= 4:
                clean_l = re.sub(r'[^a-z\s]', '', line.lower()).strip()
                if any(alias in clean_l for alias in sec['aliases']):
                    found = True
                    break

        status = 'present' if found else 'missing'
        # Student friendly check
        if not found and sec['name'] == 'Work Experience' and has_projects and has_education:
            status = 'alternative_present'

        if found or status == 'alternative_present':
            detected_count += 1

        detected_sections.append({
            'sectionName': sec['name'],
            'detected': found or status == 'alternative_present',
            'isOptionalForStudents': sec['optional_student'],
            'status': status
        })

    missing_core = [s['sectionName'] for s in detected_sections if s['status'] == 'missing' and not s['isOptionalForStudents']]
    if not missing_core:
        checks.append({
            'id': 'chk-sections-pass',
            'category': 'sections',
            'title': 'Standard Section Hierarchy',
            'status': 'pass',
            'verificationLevel': 'verified',
            'message': f'All core sections detected ({detected_count} recognized).'
        })
    else:
        checks.append({
            'id': 'chk-sections-missing',
            'category': 'sections',
            'title': 'Standard Section Hierarchy',
            'status': 'warning',
            'verificationLevel': 'verified',
            'message': f"Unconventional or absent section titles: {', '.join(missing_core)}.",
            'recommendation': 'Use standard headings (Technical Skills, Education, Projects, Experience).'
        })

    # 4. Formatting Risk
    has_symbols = len(re.findall(r'[❖★◆▲▼■●✓✔✕✖]', resume_text)) > 15
    if has_symbols:
        checks.append({
            'id': 'chk-format-symbols',
            'category': 'formatting_risk',
            'title': 'Special Bullet Glyphs',
            'status': 'warning',
            'verificationLevel': 'verified',
            'message': 'Stylized geometric bullets detected which may corrupt in older parsers.',
            'recommendation': 'Replace custom glyphs with standard round bullets (•) or hyphens (-).'
        })
    else:
        checks.append({
            'id': 'chk-format-symbols-ok',
            'category': 'formatting_risk',
            'title': 'Standard Characters & Punctuation',
            'status': 'pass',
            'verificationLevel': 'verified',
            'message': 'Uses standard characters without corrupt glyphs.'
        })

    # Layout unverified notice
    checks.append({
        'id': 'chk-unverified-layout',
        'category': 'formatting_risk',
        'title': 'Visual Multi-Column Layouts & Graphics',
        'status': 'unverified',
        'verificationLevel': 'unverified',
        'message': 'Floating text frames, table borders, and image text cannot be reliably verified without visual layout rendering.',
        'details': 'Stream parsers discard 2D coordinates.',
        'recommendation': 'Avoid placing critical credentials inside Canva design boxes.'
    })

    # 5. Keyword Alignment
    if missing_skills:
        checks.append({
            'id': 'chk-keywords-gap',
            'category': 'keyword_alignment',
            'title': 'Job Requisition Keyword Density',
            'status': 'warning' if len(missing_skills) > 3 else 'pass',
            'verificationLevel': 'verified',
            'message': f'Resume is missing {len(missing_skills)} requisition keywords.',
            'details': f"Missing: {', '.join(missing_skills[:5])}"
        })

    # 6. Score Calculation
    contact_score = (10 if email_found else 0) + (7 if phone_found else 0) + (3 if linkedin_found else 0)
    sections_score = min(30, detected_count * 5.5)
    formatting_score = 25 - (15 if not is_extractable else 0) - (8 if potential_misordering else 0) - (5 if has_symbols else 0)
    formatting_score = max(0, formatting_score)
    keyword_score = max(5, 25 - min(20, len(missing_skills) * 2.5))

    ats_score = round(contact_score + sections_score + formatting_score + keyword_score)
    recommendations = []
    if not email_found or not phone_found:
        recommendations.append({
            'priority': 'high',
            'issue': 'Incomplete or Unparsable Contact Information',
            'fix': 'Add your email and phone number near the top of the document as regular text.',
            'reason': 'Recruiters and automated parsers need contact details to link candidates to applicant records.'
        })
    if missing_core:
        recommendations.append({
            'priority': 'high',
            'issue': f"Missing or Non-Standard Headings ({', '.join(missing_core)})",
            'fix': f"Use standard ATS headings for: {', '.join(missing_core)}.",
            'reason': 'Standard headings help ATS parsers group education, skills, and project information.'
        })
    if len(missing_skills) > 2:
        recommendations.append({
            'priority': 'medium',
            'issue': f"Significant Skill Keyword Gaps ({', '.join(missing_skills[:4])})",
            'fix': 'Include these skills in relevant sections where you have practical experience.',
            'reason': 'Automated screeners compare resume keywords with the target job requirements.'
        })
    if has_symbols or potential_misordering:
        recommendations.append({
            'priority': 'medium',
            'issue': 'Formatting or Complex Column Layout Risk',
            'fix': 'Use a clean single-column layout and standard bullet points.',
            'reason': 'Some parsers can misread decorative symbols and multi-column layouts.'
        })
    if not linkedin_found:
        recommendations.append({
            'priority': 'low',
            'issue': 'No LinkedIn or Portfolio Link Detected',
            'fix': 'Include a LinkedIn or portfolio URL in the contact section.',
            'reason': 'A professional profile gives recruiters an additional way to verify your background.'
        })

    return {
        'atsScore': ats_score,
        'totalChecks': len(checks),
        'passedChecks': len([c for c in checks if c['status'] == 'pass']),
        'warningChecks': len([c for c in checks if c['status'] == 'warning']),
        'failedChecks': len([c for c in checks if c['status'] == 'fail']),
        'unverifiedChecks': len([c for c in checks if c['status'] == 'unverified']),
        'textExtractionStatus': {
            'wordCount': word_count,
            'characterCount': char_count,
            'isExtractable': is_extractable,
            'potentialMisorderingWarning': potential_misordering
        },
        'contactDetails': {
            'emailFound': email_found,
            'emailAddress': email_address,
            'phoneFound': phone_found,
            'phoneNumber': phone_number,
            'linkedinFound': linkedin_found
        },
        'sectionsDetected': detected_sections,
        'checks': checks,
        'recommendations': recommendations,
        'scoringBreakdown': {
            'contactScore': contact_score,
            'sectionsScore': round(sections_score),
            'formattingScore': round(formatting_score),
            'keywordScore': round(keyword_score)
        },
        'disclaimer': 'This ATS Compatibility Score measures algorithmic text accessibility, section hierarchy, and contact discoverability. It is not an actual ATS vendor score (e.g. Workday, Taleo, Greenhouse) and does not guarantee passing human or automated employer screening.'
    }
