from typing import Dict, Any

def generate_text_report(analysis: Dict[str, Any]) -> str:
    """
    Generates an exhaustive, formal analysis report containing all academic and
    ATS diagnostic criteria for the Final Year Project evaluation.
    """
    ats_report = analysis.get('ats_compatibility_report', {})
    ats_score = ats_report.get('atsScore', analysis.get('ats_readability_score', 80))
    
    lines = [
        "# AI ResumeMatch — Comprehensive Analysis & ATS Compatibility Report",
        "Academic Final Year Project (FYP) Evaluation & Candidate Diagnostic",
        "=" * 72,
        f"Generated Timestamp : {analysis.get('timestamp', 'N/A')}",
        f"Record Identifier   : {analysis.get('id', 'N/A')}",
        f"Candidate Resume    : {analysis.get('resume_title', 'Resume')}",
        f"Target Position     : {analysis.get('job_title', 'Job Role')}",
        f"Word Count (Resume) : {analysis.get('word_count_resume', 0)} words",
        f"Word Count (Job)    : {analysis.get('word_count_jd', 0)} words",
        f"Engine Architecture : Local scikit-learn TF-IDF + Cosine (Zero External APIs)",
        "=" * 72,
        "",
        "## 1. Primary Evaluation Scores",
        f"- Overall Composite Score    : {analysis.get('overall_score', 0)} / 100",
        f"- TF-IDF Cosine Similarity   : {analysis.get('cosine_similarity', 0.0)}%",
        f"- Skill Coverage Rate        : {analysis.get('skill_match_score', 0.0)}%",
        f"- ATS Compatibility Score    : {ats_score} / 100",
        "",
        "> IMPORTANT NOTICE & DISCLAIMER:",
        "> The textual similarity score and ATS score measure vocabulary overlap and",
        "> document parsability. Neither metric represents an official employer ATS vendor",
        "> score (e.g., Workday, Taleo, Greenhouse) or guarantees selection for an interview.",
        "",
        "## 2. Mathematical Explanation of Similarity Scoring",
        "- Vector Space Model (VSM): Resume and job requisition are projected onto high-dimensional",
        "  vector space based on n-gram tokenization (unigrams and bigrams).",
        "- Sublinear TF Weighting: tf(t, d) = 1 + ln(count(t, d)) for count > 0.",
        "  Penalizes keyword stuffing and artificial keyword repetition.",
        "- Smooth Inverse Document Frequency: idf(t) = ln((1 + N) / (1 + df(t))) + 1.",
        "  Elevates discriminating technical competencies over general stopwords.",
        "- L2 Euclidean Normalization: ||v||2 = sqrt(sum(vi^2)). Corrects for document length.",
        "- Cosine Distance: cos(theta) = (u . v) / (||u||2 * ||v||2). Measures vector angle.",
        "",
        "## 3. ATS Compatibility Scoring Methodology",
        f"The ATS score ({ats_score}/100) audits four diagnostic pillars:",
        "1. Contact Information Discoverability (Max 20 pts): Email, phone, location, LinkedIn.",
        "2. Section Hierarchy (Max 30 pts): Summary, Skills, Experience, Education, Projects.",
        "   *Student Protection: Validates project portfolios in lieu of employment tenure.",
        "3. Formatting Safety (Max 25 pts): Extractability, line lengths, special characters.",
        "4. Keyword Alignment (Max 25 pts): Occurrence of core job competencies.",
        "",
        "## 4. Contact Details & Section Hierarchy Audit",
    ]
    
    contacts = ats_report.get('contactDetails', {})
    lines.append(f"- Email Detected     : {'YES (' + contacts.get('emailAddress', '') + ')' if contacts.get('emailFound') else 'MISSING (High Risk)'}")
    lines.append(f"- Phone Detected     : {'YES (' + contacts.get('phoneNumber', '') + ')' if contacts.get('phoneFound') else 'MISSING (High Risk)'}")
    lines.append(f"- LinkedIn Link      : {'YES (' + contacts.get('linkedinUrl', 'Found') + ')' if contacts.get('linkedinFound') else 'Optional (Recommended)'}")
    lines.append(f"- Location Detected  : {'YES' if contacts.get('locationFound') else 'Not Explicitly Detected'}")
    lines.append("")
    
    sections = ats_report.get('sectionsDetected', [])
    if sections:
        lines.append("### Detected Standard Headings (Student Protection Enabled):")
        for sec in sections:
            status_lbl = "PRESENT" if sec.get('status') == 'present' else ("PROTECTED (Alternative Present)" if sec.get('status') == 'alternative_present' else "MISSING / NON-STANDARD")
            lines.append(f"- {sec.get('sectionName')} : {status_lbl} — {sec.get('explanation', '')}")
        lines.append("")
        
    lines.append("## 5. Formatting Risks & Parsing Warnings")
    formatting = ats_report.get('formattingRisks', {})
    lines.append(f"- Special Characters : {'WARNING: Non-standard unicode glyphs found' if formatting.get('hasSpecialCharacters') else 'PASS: Clean standard ASCII/UTF-8'}")
    lines.append(f"- Bullet Density     : {'WARNING: High density without narrative text' if formatting.get('excessiveBulletPoints') else 'PASS: Balanced bullet structure'}")
    lines.append(f"- Line Length Issues : {'WARNING: Long unpunctuated lines detected' if formatting.get('lineLengthIssues') else 'PASS: Standard line lengths'}")
    
    unusual_headings = formatting.get('unusualSectionHeadings', [])
    if unusual_headings:
        lines.append(f"- Unusual Headings   : WARNING: {', '.join(unusual_headings)}")
    else:
        lines.append("- Heading Standards  : PASS: All headers follow standard industry naming")
    lines.append("")

    lines.append("## 6. Technical & Domain Skill Alignment")
    matched = analysis.get('matched_skills', [])
    if matched:
        lines.append(f"### Matched Skills ({len(matched)}):")
        for s in matched:
            lines.append(f"- [MATCH] {s.get('name')} ({s.get('category')}) — Mentioned in JD ({s.get('frequencyInJD', 1)}x)")
    else:
        lines.append("- No direct technical skills matched.")
    lines.append("")
    
    missing = analysis.get('missing_skills', [])
    if missing:
        lines.append(f"### Missing Skill Gaps ({len(missing)}):")
        for s in missing:
            lines.append(f"- [MISSING] {s.get('name')} [{s.get('importance', 'Required')}] ({s.get('category')}) — Required in JD ({s.get('frequencyInJD', 1)}x)")
    else:
        lines.append("- All required technical competencies are present.")
    lines.append("")
    
    terms = analysis.get('top_term_weights', [])
    if terms:
        lines.append("## 7. Highest-Weighted TF-IDF Keywords")
        lines.append(f"{'Term':<25} {'Resume Weight':<15} {'Job Weight':<15} {'Type':<15}")
        lines.append("-" * 70)
        for t in terms[:12]:
            t_type = "Skill" if t.get('isSkill') else "Context Keyword"
            lines.append(f"{t.get('term', ''):<25} {t.get('resumeWeight', 0.0):<15.4f} {t.get('jobWeight', 0.0):<15.4f} {t_type:<15}")
        lines.append("")

    lines.append("## 8. Prioritized Actionable Recommendations")
    recs = analysis.get('recommendations', [])
    for r in recs:
        lines.append(f"### [{r.get('type', 'REC').upper()}] {r.get('title')}")
        lines.append(f"- Target Section   : {r.get('targetSection', 'General')}")
        lines.append(f"- Observation      : {r.get('description')}")
        lines.append(f"- Recommended Action: {r.get('suggestedAction')}")
        lines.append("")
        
    lines.append("## 9. Verification Taxonomy & Technical Limitations")
    lines.append("1. Verified Deterministically : Contact info regex, character encoding, word counts.")
    lines.append("2. Approximate Heuristics     : Reading order continuity, section heading synonyms.")
    lines.append("3. Unverified Limitations    : Visual 2D multi-column layouts and text inside image frames")
    lines.append("   cannot be validated without optical character recognition (OCR).")
    lines.append("4. Non-Invention Rule         : Candidates must only add competencies they actually possess.")
    lines.append("")
    lines.append("=" * 72)
    lines.append("Report generated by AI ResumeMatch — Explainable NLP FYP Engine.")
    
    return "\n".join(lines)
