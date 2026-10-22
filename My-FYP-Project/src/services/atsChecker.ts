import { AtsCompatibilityReport, AtsCheckItem, AtsSectionDetection } from '../types';
import { getSkillsDictionary } from '../data/skillsDictionary';

/**
 * Evaluates a resume text for Applicant Tracking System (ATS) compatibility
 * based on text extractability, contact details, standard section headers,
 * formatting risks, and job-description keyword alignment.
 */
export function evaluateAtsCompatibility(
  resumeText: string,
  jobDescriptionText: string = '',
  missingSkillsList: string[] = []
): AtsCompatibilityReport {
  const checks: AtsCheckItem[] = [];
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const words = resumeText.trim().split(/\s+/).filter(Boolean);
  const lowerText = resumeText.toLowerCase();

  // ==========================================
  // 1. TEXT EXTRACTION CHECK
  // ==========================================
  const wordCount = words.length;
  const charCount = resumeText.length;
  const isExtractable = wordCount >= 30;
  
  // Heuristic: check if lines look like broken single words (indicative of table column misorder)
  const singleWordLines = lines.filter(l => l.split(/\s+/).length === 1).length;
  const potentialMisorderingWarning = lines.length > 20 && (singleWordLines / lines.length) > 0.45;

  if (wordCount < 30) {
    checks.push({
      id: 'chk-extraction-empty',
      category: 'text_extraction',
      title: 'Resume text',
      status: 'fail',
      verificationLevel: 'verified',
      message: 'Very little text was found. The file may be damaged, password-protected, or scanned as an image.',
      details: `Extracted ${wordCount} words and ${charCount} characters.`,
      recommendation: 'Use a document with selectable text. Scanned image files may not be readable.'
    });
  } else if (potentialMisorderingWarning) {
    checks.push({
      id: 'chk-extraction-order',
      category: 'text_extraction',
      title: 'Text reading order',
      status: 'warning',
      verificationLevel: 'approximate',
      message: 'Some lines may be out of order. This can happen with columns or tables.',
      details: `${singleWordLines} out of ${lines.length} lines contain only single words.`,
      recommendation: 'Try a simple, single-column layout.'
    });
  } else {
    checks.push({
      id: 'chk-extraction-pass',
      category: 'text_extraction',
      title: 'Text can be read',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'The resume text was read successfully.',
      details: `${wordCount} words cleanly parsed across ${lines.length} lines.`
    });
  }

  // ==========================================
  // 2. CONTACT DETAILS CHECK
  // ==========================================
  const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
  const emailMatch = resumeText.match(emailRegex);
  const emailFound = !!emailMatch;
  const emailAddress = emailMatch ? emailMatch[0] : undefined;

  const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/;
  const phoneMatch = resumeText.match(phoneRegex);
  const phoneFound = !!phoneMatch;
  const phoneNumber = phoneMatch ? phoneMatch[0] : undefined;

  const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin:\s*)([a-zA-Z0-9_-]+)/i;
  const linkedinMatch = resumeText.match(linkedinRegex);
  const linkedinFound = !!linkedinMatch || lowerText.includes('linkedin');
  const linkedinUrl = linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : undefined;

  // Location heuristics (City, State / ZIP code / Country)
  const locationRegex = /\b[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Za-z]+)\b/;
  const locationFound = locationRegex.test(resumeText) || lowerText.includes('san francisco') || lowerText.includes('new york') || lowerText.includes('austin') || lowerText.includes('remote');

  // Contact checks
  if (emailFound && phoneFound) {
    checks.push({
      id: 'chk-contact-core',
      category: 'contact_info',
      title: 'Essential Contact Details',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'An email address and phone number were found in the resume text.',
      details: `Email: ${emailAddress} · Phone: ${phoneNumber}`
    });
  } else {
    checks.push({
      id: 'chk-contact-missing',
      category: 'contact_info',
      title: 'Essential Contact Details',
      status: 'fail',
      verificationLevel: 'verified',
      message: `Could not find ${!emailFound ? 'an email address' : ''}${!emailFound && !phoneFound ? ' or ' : ''}${!phoneFound ? 'a phone number' : ''}.`,
      recommendation: 'Add your email address and phone number near the top of your resume as regular text.'
    });
  }

  if (linkedinFound) {
    checks.push({
      id: 'chk-contact-linkedin',
      category: 'contact_info',
      title: 'Professional profile link',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'A LinkedIn or portfolio link was found.',
      details: linkedinUrl || 'LinkedIn reference found'
    });
  } else {
    checks.push({
      id: 'chk-contact-no-linkedin',
      category: 'contact_info',
      title: 'Professional Profile Link',
      status: 'warning',
      verificationLevel: 'approximate',
      message: 'No LinkedIn or GitHub link was found.',
      recommendation: 'Add a link to your LinkedIn profile or portfolio if you have one.'
    });
  }

  // ==========================================
  // 3. STANDARD SECTIONS DETECTION
  // ==========================================
  const standardSectionsConfig = [
    {
      name: 'Summary / Profile',
      aliases: ['summary', 'professional summary', 'profile', 'about me', 'objective', 'executive summary'],
      isOptionalForStudents: true,
      explanation: 'Introduces candidate strengths and career target.'
    },
    {
      name: 'Technical Skills',
      aliases: ['technical skills', 'skills', 'competencies', 'core competencies', 'technologies', 'skills & tools'],
      isOptionalForStudents: false,
      explanation: 'Critical for automated keyword indexing.'
    },
    {
      name: 'Work Experience',
      aliases: ['experience', 'work experience', 'professional experience', 'employment history', 'work history'],
      isOptionalForStudents: true,
      explanation: 'Evaluates chronological industry background.'
    },
    {
      name: 'Education',
      aliases: ['education', 'academic background', 'degrees', 'academic qualifications', 'university'],
      isOptionalForStudents: false,
      explanation: 'Validates degree requirements.'
    },
    {
      name: 'Projects',
      aliases: ['projects', 'key projects', 'academic projects', 'personal projects', 'portfolio projects'],
      isOptionalForStudents: false,
      explanation: 'Crucial for students and career switchers without extensive formal tenure.'
    },
    {
      name: 'Certifications',
      aliases: ['certifications', 'licenses', 'certificates', 'professional development'],
      isOptionalForStudents: true,
      explanation: 'Supplementary proof of domain specialization.'
    }
  ];

  const sectionsDetected: AtsSectionDetection[] = [];
  let detectedSectionsCount = 0;

  for (const sec of standardSectionsConfig) {
    let found = false;
    let headerFound: string | undefined = undefined;

    for (const line of lines) {
      const cleanLine = line.toLowerCase().replace(/[^a-z\s]/g, '').trim();
      if (sec.aliases.includes(cleanLine) || sec.aliases.some(a => cleanLine === a)) {
        found = true;
        headerFound = line;
        break;
      }
    }

    if (!found) {
      // Secondary check: look for alias as substring in line with under 5 words
      for (const line of lines) {
        if (line.split(/\s+/).length <= 4) {
          const clean = line.toLowerCase();
          if (sec.aliases.some(a => clean.includes(a))) {
            found = true;
            headerFound = line;
            break;
          }
        }
      }
    }

    let status: 'present' | 'missing' | 'alternative_present' = found ? 'present' : 'missing';

    // Student friendly logic: If Work Experience is missing but Projects & Education are present
    if (!found && sec.name === 'Work Experience') {
      const hasProjects = lines.some(l => l.toLowerCase().includes('project'));
      const hasEducation = lines.some(l => l.toLowerCase().includes('education') || l.toLowerCase().includes('bachelor') || l.toLowerCase().includes('master') || l.toLowerCase().includes('university'));
      if (hasProjects && hasEducation) {
        status = 'alternative_present';
      }
    }

    if (found || status === 'alternative_present') {
      detectedSectionsCount++;
    }

    sectionsDetected.push({
      sectionName: sec.name,
      detected: found || status === 'alternative_present',
      headerFound,
      isOptionalForStudents: sec.isOptionalForStudents,
      status,
      explanation: sec.explanation
    });
  }

  // Section checks item
  const missingCoreSections = sectionsDetected.filter(s => s.status === 'missing' && !s.isOptionalForStudents);
  if (missingCoreSections.length === 0) {
    checks.push({
      id: 'chk-sections-pass',
      category: 'sections',
      title: 'Common resume sections',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'The main resume sections were found.',
      details: `Found ${detectedSectionsCount} common section headings.`
    });
  } else {
    checks.push({
      id: 'chk-sections-missing',
      category: 'sections',
      title: 'Standard Section Hierarchy',
      status: 'warning',
      verificationLevel: 'verified',
      message: `Could not find these common sections: ${missingCoreSections.map(s => s.sectionName).join(', ')}.`,
      recommendation: 'Use clear headings such as "Work Experience", "Education", and "Skills".'
    });
  }

  // ==========================================
  // 4. FORMATTING RISKS & ANOMALIES
  // ==========================================
  const weirdSymbolRegex = /[❖★◆▲▼■●✓✔✕✖\u2022\u25A0\u25CF\u25BA]/g;
  const symbolMatches = resumeText.match(weirdSymbolRegex);
  const hasSpecialCharacters = (symbolMatches?.length || 0) > 15;

  // Line length distribution heuristic
  const veryLongLines = lines.filter(l => l.length > 250).length;
  const lineLengthIssues = veryLongLines > 4;

  if (hasSpecialCharacters) {
    checks.push({
      id: 'chk-format-symbols',
      category: 'formatting_risk',
      title: 'Decorative symbols',
      status: 'warning',
      verificationLevel: 'verified',
      message: 'Many decorative symbols were found.',
      details: `Found ${symbolMatches?.length} stylized symbol instances.`,
      recommendation: 'Use simple bullets or hyphens instead of decorative symbols.'
    });
  } else {
    checks.push({
      id: 'chk-format-symbols-ok',
      category: 'formatting_risk',
      title: 'Text and bullet symbols',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'No unusual bullet symbols were found.'
    });
  }

  // Unverified checks notice (crucial per instructions: clearly label anything that cannot be verified automatically)
  checks.push({
    id: 'chk-unverified-layout',
    category: 'formatting_risk',
    title: 'Page layout and text in images',
    status: 'unverified',
    verificationLevel: 'unverified',
    message: 'The app cannot check how columns, text boxes, or images look on the page.',
    details: 'It checks the text it can read, not the full page layout.',
    recommendation: 'Keep important details in regular text and check the original document yourself.'
  });

  // ==========================================
  // 5. KEYWORD & SKILL ALIGNMENT
  // ==========================================
  if (missingSkillsList && missingSkillsList.length > 0) {
    if (missingSkillsList.length <= 3) {
      checks.push({
        id: 'chk-keyword-alignment',
        category: 'keyword_alignment',
        title: 'Skills from the job posting',
        status: 'pass',
        verificationLevel: 'verified',
        message: 'Most listed skills were found. A few were not.',
        details: `Missing: ${missingSkillsList.join(', ')}`
      });
    } else {
      checks.push({
        id: 'chk-keyword-alignment-gaps',
        category: 'keyword_alignment',
        title: 'Skills from the job posting',
        status: 'warning',
        verificationLevel: 'verified',
        message: `${missingSkillsList.length} skills from the job posting were not found in the resume.`,
        details: `Key gaps: ${missingSkillsList.slice(0, 5).join(', ')}`,
        recommendation: 'If you have these skills, mention them where they fit in your resume.'
      });
    }
  } else {
    checks.push({
      id: 'chk-keyword-alignment-nominal',
      category: 'keyword_alignment',
      title: 'Skills from the job posting',
      status: 'pass',
      verificationLevel: 'verified',
      message: 'All skills on the check list were found in the resume.'
    });
  }

  // ==========================================
  // 6. SCORING SYSTEM (0 to 100)
  // ==========================================
  // Contact details: max 20 pts
  let contactScore = 0;
  if (emailFound) contactScore += 10;
  if (phoneFound) contactScore += 7;
  if (linkedinFound) contactScore += 3;

  // Sections: max 30 pts (5 pts per detected standard section, with student protection)
  let sectionsScore = Math.min(30, detectedSectionsCount * 5.5);

  // Formatting & text extraction: max 25 pts
  let formattingScore = 25;
  if (!isExtractable) formattingScore -= 20;
  if (potentialMisorderingWarning) formattingScore -= 10;
  if (hasSpecialCharacters) formattingScore -= 5;
  if (lineLengthIssues) formattingScore -= 5;
  formattingScore = Math.max(0, formattingScore);

  // Keyword alignment: max 25 pts
  let keywordScore = 25;
  if (missingSkillsList && missingSkillsList.length > 0) {
    const penalty = Math.min(20, missingSkillsList.length * 2.5);
    keywordScore = Math.max(5, 25 - penalty);
  }

  const atsScore = Math.round(contactScore + sectionsScore + formattingScore + keywordScore);

  // ==========================================
  // 7. PRIORITIZED RECOMMENDATIONS
  // ==========================================
  const recommendations: { priority: 'high' | 'medium' | 'low'; issue: string; fix: string; reason: string }[] = [];

  if (!emailFound || !phoneFound) {
    recommendations.push({
      priority: 'high',
      issue: 'Contact details are missing',
      fix: 'Add your email and phone number near the top of the resume as regular text.',
      reason: 'Recruiters need a way to contact you.'
    });
  }

  if (missingCoreSections.length > 0) {
    recommendations.push({
      priority: 'high',
      issue: `Some common sections were not found (${missingCoreSections.map(s => s.sectionName).join(', ')})`,
      fix: `Add clear headings for: ${missingCoreSections.map(s => s.sectionName).join(', ')}.`,
      reason: 'Clear headings help hiring software find parts of your resume.'
    });
  }

  if (missingSkillsList.length > 2) {
    recommendations.push({
      priority: 'medium',
      issue: `Some job skills were not found (${missingSkillsList.slice(0, 4).join(', ')})`,
      fix: 'If you have used these skills, add them to the relevant part of your resume.',
      reason: 'Hiring software may look for skills listed in the job posting.'
    });
  }

  if (hasSpecialCharacters || potentialMisorderingWarning) {
    recommendations.push({
      priority: 'medium',
      issue: 'The layout may be hard to read',
      fix: 'Try a simple, single-column layout with regular bullets.',
      reason: 'Some hiring software may read columns and text boxes in the wrong order.'
    });
  }

  if (!linkedinFound) {
    recommendations.push({
      priority: 'low',
      issue: 'No professional profile link was found',
      fix: 'Add your LinkedIn or portfolio link if you have one.',
      reason: 'A profile link can help recruiters learn more about your work.'
    });
  }

  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const warningChecks = checks.filter(c => c.status === 'warning').length;
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  const unverifiedChecks = checks.filter(c => c.status === 'unverified').length;

  return {
    atsScore,
    totalChecks: checks.length,
    passedChecks,
    warningChecks,
    failedChecks,
    unverifiedChecks,
    textExtractionStatus: {
      wordCount,
      characterCount: charCount,
      isExtractable,
      potentialMisorderingWarning
    },
    contactDetails: {
      emailFound,
      emailAddress,
      phoneFound,
      phoneNumber,
      linkedinFound,
      linkedinUrl,
      locationFound
    },
    sectionsDetected,
    formattingRisks: {
      hasSpecialCharacters,
      excessiveBulletPoints: lines.filter(l => l.startsWith('•') || l.startsWith('-')).length > 25,
      lineLengthIssues,
      unusualSectionHeadings: missingCoreSections.map(s => s.sectionName),
      unverifiedLayoutNotice: 'The app checks readable text, not the full page layout or text inside images.'
    },
    checks,
    recommendations,
    scoringBreakdown: {
      contactScore,
      sectionsScore: Math.round(sectionsScore),
      formattingScore: Math.round(formattingScore),
      keywordScore: Math.round(keywordScore)
    },
    disclaimer: 'This score checks whether some resume details can be found in the text. It is not a score from an employer’s hiring system and cannot predict whether you will pass screening.'
  };
}
