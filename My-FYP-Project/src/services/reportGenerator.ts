import { AnalysisResult } from '../types';

/**
 * Creates a Markdown report with the resume analysis results and suggestions.
 */
export function generateMarkdownReport(analysis: AnalysisResult): string {
  const report = analysis.atsCompatibilityReport;
  const atsScore = report ? report.atsScore : analysis.atsReadabilityScore;

  // Extract checks that resulted in warnings or failures for formatting risks section
  const warningChecks = report?.checks.filter(c => c.status === 'warning' || c.status === 'fail') || [];
  const unverifiedChecks = report?.checks.filter(c => c.verificationLevel === 'unverified') || [];

  return `# AI ResumeMatch — Resume Analysis Report

---

### 1. About this report
- **Created:** ${analysis.timestamp}
- **Resume:** ${analysis.resumeTitle}
- **Job posting:** ${analysis.jobTitle} ${analysis.companyName ? `(${analysis.companyName})` : ''}
- **Resume length:** ${analysis.wordCountResume} words
- **Job posting length:** ${analysis.wordCountJD} words
- **How the text match is calculated:** The app compares words in both documents.

---

### 2. Scores
| Score | Result | What it means |
| :--- | :--- | :--- |
| **Overall match** | **${analysis.overallScore} / 100** | A summary based on the text match, skills found, and resume readability checks. |
| **Text match** | **${analysis.cosineSimilarity}%** | How much wording the resume and job posting have in common. |
| **Skills match** | **${analysis.skillMatchScore}%** | Found ${analysis.matchedSkills.length} of ${analysis.matchedSkills.length + analysis.missingSkills.length} skills listed in the job posting. |
| **Resume readability** | **${atsScore} / 100** | Checks whether key details and common sections can be found in the resume text. |

> **Please note:** These scores are simple checks of wording and resume text. They are not scores from an employer’s hiring system and cannot predict whether you will be invited to an interview. Only include skills and experience you actually have.

---

### 3. How the text match works
The app compares words and short phrases in the resume and job posting. Shared, less common terms count more than common words, and repeating a word has less effect than mentioning it once. The result is a text match from 0% (few shared terms) to 100% (very similar wording). It compares the text, not your qualifications.

---

### 4. How the readability score works
The score ($${atsScore}/100$$) checks whether the app can find contact details, common section headings, readable text, and skills mentioned in the job posting. It is a basic guide; different hiring systems may read resumes differently.

---

### 5. Contact details and resume sections
${report ? `
#### Contact details:
- **Email:** ${report.contactDetails.emailFound ? `✅ Found (\`${report.contactDetails.emailAddress}\`)` : '❌ Not found'}
- **Phone:** ${report.contactDetails.phoneFound ? `✅ Found (\`${report.contactDetails.phoneNumber}\`)` : '❌ Not found'}
- **LinkedIn / Portfolio:** ${report.contactDetails.linkedinFound ? `✅ Found (\`${report.contactDetails.linkedinUrl || 'Found'}\`)` : 'ℹ️ Not found (optional)'}
- **Location:** ${report.contactDetails.locationFound ? '✅ Found' : 'ℹ️ Not found'}

#### Common section headings:
| Section | Status | Details |
| :--- | :--- | :--- |
${report.sectionsDetected.map(s => `| **${s.sectionName}** | ${s.status === 'present' ? '✅ Detected' : s.status === 'alternative_present' ? '🛡️ Alternative Present' : '⚠️ Missing / Non-Standard'} | ${s.explanation} |`).join('\n')}
` : '- Standard structural heuristics applied.'}

---

### 6. Readability checks
${report ? `
#### Resume text checks:
- **Symbols:** ${report.formattingRisks.hasSpecialCharacters ? '⚠️ Some unusual symbols were found. They may not display correctly in some hiring systems.' : '✅ No unusual symbols found.'}
- **Bullets:** ${report.formattingRisks.excessiveBulletPoints ? '⚠️ Many bullet points were found. Check that the resume is easy to scan.' : '✅ Bullet point use looks reasonable.'}
- **Long lines:** ${report.formattingRisks.lineLengthIssues ? '⚠️ Some very long lines were found. Check the original document layout.' : '✅ No very long lines found.'}
- **Section headings:** ${report.formattingRisks.unusualSectionHeadings.length > 0 ? `⚠️ Some headings may be unclear: ${report.formattingRisks.unusualSectionHeadings.join(', ')}. Try common headings.` : '✅ Common section headings were found.'}

#### Checks to review:
${warningChecks.length > 0 ? warningChecks.map(w => `- **${w.title}:** ${w.message} *(Suggestion: ${w.recommendation || 'Review this part of the resume.'}*)`).join('\n') : '- No issues were flagged by these checks.'}

#### What the app can and cannot check:
- **Checked:** Readable text (${report.textExtractionStatus.wordCount} words), contact details, and skills.
- **May be missed:** Different wording for section headings and the order of text on the page.
- **Page layout:** ${report.formattingRisks.unverifiedLayoutNotice}
` : '- Formatting risks assessed via standard heuristics.'}

---

### 7. Skills found and not found
#### Skills found (${analysis.matchedSkills.length}):
${analysis.matchedSkills.length > 0 
  ? analysis.matchedSkills.map(s => `- **${s.name}** (${s.category}) — Listed ${s.frequencyInJD} times in the job posting`).join('\n') 
  : '- No matching skills were found.'}

#### Skills not found (${analysis.missingSkills.length}):
${analysis.missingSkills.length > 0 
  ? analysis.missingSkills.map(s => `- **${s.name}** [${s.importance.toUpperCase()}] (${s.category}) — Listed ${s.frequencyInJD} times in the job posting`).join('\n') 
  : '- All listed skills were found in the resume.'}

#### Skills by category:
| Category | In job posting | Found in resume | Not found | Match |
| :--- | :--- | :--- | :--- | :--- |
${analysis.categoryGaps.map(g => `| **${g.category}** | ${g.totalRequired} | ${g.matchedCount} | ${g.missingCount} | ${g.matchPercentage}% |`).join('\n')}

---

### 8. Important words in each document
These are words that help distinguish the job posting and resume text:

| Word | Resume score | Job posting score | Type |
| :--- | :--- | :--- | :--- |
${analysis.topTermWeights.slice(0, 15).map(t => `| **${t.term}** | ${t.resumeWeight.toFixed(4)} | ${t.jobWeight.toFixed(4)} | ${t.isSkill ? '🏷️ Technical Skill' : '📄 Context Keyword'} |`).join('\n')}

---

### 9. Suggestions
${analysis.recommendations.map(r => `#### [${r.type.toUpperCase()}] ${r.title}
- **Target Resume Section:** ${r.targetSection}
- **Context & Observation:** ${r.description}
- **Recommended Action:** ${r.suggestedAction}
`).join('\n')}

---

### 10. Limits of these checks
1. The app reads text, so columns, tables, headers, and text boxes may appear in the wrong order.
2. Scanned images may not contain readable text for the app to check.
3. Employers use different hiring systems. This score cannot guarantee how a specific system will read your resume.
4. Only add skills and experience that you actually have. Do not add words just to raise a score.

---
*Report created by AI ResumeMatch.*
`;
}

/**
 * Creates a printable HTML report that can be saved as a PDF.
 */
export function generateHtmlReport(analysis: AnalysisResult): string {
  const report = analysis.atsCompatibilityReport;
  const atsScore = report ? report.atsScore : analysis.atsReadabilityScore;

  const warningChecks = report?.checks.filter(c => c.status === 'warning' || c.status === 'fail') || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI ResumeMatch Report — ${analysis.resumeTitle}</title>
  <style>
    :root {
      --primary: #0F172A;
      --indigo: #4F46E5;
      --indigo-light: #EEF2FF;
      --emerald: #059669;
      --emerald-light: #ECFDF5;
      --amber: #D97706;
      --amber-light: #FFFBEB;
      --rose: #DC2626;
      --rose-light: #FEF2F2;
      --slate-50: #F8FAFC;
      --slate-100: #F1F5F9;
      --slate-200: #E2E8F0;
      --slate-500: #64748B;
      --slate-700: #334155;
      --slate-900: #0F172A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: var(--slate-900);
      background: #FFFFFF;
      padding: 40px 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header-bar {
      border-bottom: 2px solid var(--slate-200);
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .project-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--indigo);
      background: var(--indigo-light);
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    h1 { font-size: 22px; font-weight: 800; color: var(--primary); letter-spacing: -0.02em; }
    .meta-text { font-size: 12px; color: var(--slate-500); margin-top: 4px; }
    .print-actions { display: flex; gap: 8px; }
    .btn {
      font-size: 12px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: #1E293B; }
    .btn-secondary { background: var(--slate-100); color: var(--slate-700); border-color: var(--slate-200); }
    .btn-secondary:hover { background: var(--slate-200); }
    
    .disclaimer-box {
      background: var(--amber-light);
      border: 1px solid #FCD34D;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 11.5px;
      color: #92400E;
      line-height: 1.45;
    }
    .disclaimer-box strong { color: #78350F; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .kpi-card {
      border: 1px solid var(--slate-200);
      background: var(--slate-50);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .kpi-val {
      font-size: 26px;
      font-weight: 800;
      font-family: monospace;
      color: var(--indigo);
      letter-spacing: -0.02em;
    }
    .kpi-val.emerald { color: var(--emerald); }
    .kpi-lbl {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--slate-500);
      margin-top: 2px;
    }

    h2 {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1.5px solid var(--slate-200);
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 12px;
    }
    h3 { font-size: 13px; font-weight: 700; color: var(--slate-700); margin: 12px 0 6px 0; }
    p, li { font-size: 12px; color: var(--slate-700); line-height: 1.5; }
    ul { padding-left: 18px; margin-bottom: 10px; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid var(--slate-200);
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: var(--slate-100);
      color: var(--slate-700);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td.mono { font-family: monospace; font-size: 11.5px; }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .badge-pass { background: var(--emerald-light); color: var(--emerald); }
    .badge-warn { background: var(--amber-light); color: var(--amber); }
    .badge-fail { background: var(--rose-light); color: var(--rose); }
    .badge-info { background: var(--indigo-light); color: var(--indigo); }

    .formula-box {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 6px;
      padding: 12px;
      font-size: 11.5px;
      font-family: monospace;
      color: var(--slate-700);
      margin: 8px 0 16px 0;
      line-height: 1.4;
    }

    .rec-box {
      border: 1px solid var(--slate-200);
      background: var(--slate-50);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .rec-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .rec-title { font-weight: 700; font-size: 12px; color: var(--slate-900); }
    .rec-action {
      margin-top: 6px;
      color: var(--indigo);
      font-weight: 600;
      font-size: 11.5px;
    }

    .footer {
      margin-top: 40px;
      border-top: 1px solid var(--slate-200);
      padding-top: 16px;
      font-size: 11px;
      color: var(--slate-500);
      text-align: center;
    }

    @media print {
      body { padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .kpi-card { border: 1px solid #CCC; }
      table, th, td { border: 1px solid #CCC; }
      h2 { page-break-after: avoid; }
      .rec-box { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print header-bar" style="border-bottom: none; margin-bottom: 10px;">
    <div>
      <span class="project-badge">AI ResumeMatch report</span>
    </div>
    <div class="print-actions">
      <button onclick="window.print()" class="btn btn-primary">
        🖨️ Print / Save as PDF
      </button>
    </div>
  </div>

  <div class="header-bar">
    <div>
      <h1>AI ResumeMatch — Resume Analysis Report</h1>
      <div class="meta-text">
        Created: <strong>${analysis.timestamp}</strong><br>
        Resume: <strong>${analysis.resumeTitle}</strong> &bull; Job posting: <strong>${analysis.jobTitle}</strong> ${analysis.companyName ? `(${analysis.companyName})` : ''}
      </div>
    </div>
  </div>

  <div class="disclaimer-box">
    <strong>Please note:</strong> These scores check wording and readable resume text. They are not scores from an employer’s hiring system and cannot predict whether you will get an interview. Only include skills and experience you actually have.
  </div>

  <h2>1. Scores</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${analysis.overallScore}%</div>
      <div class="kpi-lbl">Overall match</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${analysis.cosineSimilarity}%</div>
      <div class="kpi-lbl">Text match</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${analysis.skillMatchScore}%</div>
      <div class="kpi-lbl">Skills match</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val emerald">${atsScore}%</div>
      <div class="kpi-lbl">Resume readability</div>
    </div>
  </div>

  <h2>2. How the text match works</h2>
  <p>The app compares words and short phrases in the resume and job posting. Shared terms that are less common count more, while repeating a word has less effect.</p>
  <div class="formula-box">
    1. Sublinear Term Frequency : tf(t, d) = 1 + ln(count(t, d))  (dampens keyword repetition)<br>
    2. Smooth Inverse Doc Freq : idf(t) = ln((1 + N) / (1 + df(t))) + 1<br>
    3. L2 Euclidean Normalization: ||v||₂ = sqrt(sum(v_i²))<br>
    4. Cosine Similarity Angle : cos(θ) = (u · v) / (||u||₂ · ||v||₂)
  </div>
  <p>This score compares the text, not your qualifications. Only include skills and experience you actually have.</p>

  <h2>3. Contact details and resume sections</h2>
  <table>
    <thead>
      <tr><th>Item</th><th>Status</th><th>Details</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Email Address</strong></td>
        <td><span class="badge ${report?.contactDetails.emailFound ? 'badge-pass' : 'badge-fail'}">${report?.contactDetails.emailFound ? 'PASS' : 'FAIL'}</span></td>
        <td class="mono">${report?.contactDetails.emailAddress || 'No email address was found.'}</td>
      </tr>
      <tr>
        <td><strong>Telephone Number</strong></td>
        <td><span class="badge ${report?.contactDetails.phoneFound ? 'badge-pass' : 'badge-fail'}">${report?.contactDetails.phoneFound ? 'PASS' : 'FAIL'}</span></td>
        <td class="mono">${report?.contactDetails.phoneNumber || 'No phone number was found.'}</td>
      </tr>
      <tr>
        <td><strong>LinkedIn / Portfolio</strong></td>
        <td><span class="badge ${report?.contactDetails.linkedinFound ? 'badge-pass' : 'badge-info'}">${report?.contactDetails.linkedinFound ? 'DETECTED' : 'OPTIONAL'}</span></td>
        <td>${report?.contactDetails.linkedinUrl || 'Not found (optional)'}</td>
      </tr>
      <tr>
        <td><strong>Location Details</strong></td>
        <td><span class="badge ${report?.contactDetails.locationFound ? 'badge-pass' : 'badge-info'}">${report?.contactDetails.locationFound ? 'DETECTED' : 'NOT FOUND'}</span></td>
        <td>${report?.contactDetails.locationFound ? 'A location was found.' : 'No location was found.'}</td>
      </tr>
    </tbody>
  </table>

  <h3>Common section headings</h3>
  <table>
    <thead>
      <tr><th>Section</th><th>Status</th><th>Details</th></tr>
    </thead>
    <tbody>
      ${(report?.sectionsDetected || []).map(s => `
        <tr>
          <td><strong>${s.sectionName}</strong></td>
          <td>
            <span class="badge ${s.status === 'present' ? 'badge-pass' : s.status === 'alternative_present' ? 'badge-info' : 'badge-warn'}">
              ${s.status === 'present' ? 'FOUND' : s.status === 'alternative_present' ? 'ALTERNATIVE FOUND' : 'NOT FOUND'}
            </span>
          </td>
          <td>${s.explanation}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>4. Readability checks</h2>
  <table>
    <thead>
      <tr><th>Check</th><th>Status</th><th>Details</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Symbols</strong></td>
        <td><span class="badge ${report?.formattingRisks.hasSpecialCharacters ? 'badge-warn' : 'badge-pass'}">${report?.formattingRisks.hasSpecialCharacters ? 'WARNING' : 'PASS'}</span></td>
        <td>${report?.formattingRisks.hasSpecialCharacters ? 'Some unusual symbols were found. They may not display correctly in some hiring systems.' : 'No unusual symbols were found.'}</td>
      </tr>
      <tr>
        <td><strong>Bullet points</strong></td>
        <td><span class="badge ${report?.formattingRisks.excessiveBulletPoints ? 'badge-warn' : 'badge-pass'}">${report?.formattingRisks.excessiveBulletPoints ? 'WARNING' : 'PASS'}</span></td>
        <td>${report?.formattingRisks.excessiveBulletPoints ? 'Many bullet points were found. Check that the resume is easy to scan.' : 'Bullet point use looks reasonable.'}</td>
      </tr>
      <tr>
        <td><strong>Long lines</strong></td>
        <td><span class="badge ${report?.formattingRisks.lineLengthIssues ? 'badge-warn' : 'badge-pass'}">${report?.formattingRisks.lineLengthIssues ? 'WARNING' : 'PASS'}</span></td>
        <td>${report?.formattingRisks.lineLengthIssues ? 'Some very long lines were found. Check the original document layout.' : 'No very long lines were found.'}</td>
      </tr>
    </tbody>
  </table>

  ${warningChecks.length > 0 ? `
    <h3>Checks to review</h3>
    <ul>
      ${warningChecks.map(w => `<li><strong>${w.title}:</strong> ${w.message} ${w.recommendation ? `<em>(Action: ${w.recommendation})</em>` : ''}</li>`).join('')}
    </ul>
  ` : ''}

  <h2>5. Skills found and not found</h2>
  <p style="margin-bottom: 8px;">These are skills the app found in the job posting and checked in your resume.</p>
  <table>
    <thead>
      <tr><th>Skill</th><th>Category</th><th>Importance</th><th>Resume</th></tr>
    </thead>
    <tbody>
      ${analysis.matchedSkills.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.category}</td>
          <td>${s.importance}</td>
          <td><span class="badge badge-pass">FOUND (${s.frequencyInJD} times in job posting)</span></td>
        </tr>
      `).join('')}
      ${analysis.missingSkills.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.category}</td>
          <td>${s.importance}</td>
          <td><span class="badge badge-fail">NOT FOUND (${s.frequencyInJD} times in job posting)</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>6. Important words in each document</h2>
  <table>
    <thead>
      <tr><th>Word</th><th>Resume score</th><th>Job posting score</th><th>Type</th></tr>
    </thead>
    <tbody>
      ${analysis.topTermWeights.slice(0, 12).map(t => `
        <tr>
          <td><strong>${t.term}</strong></td>
          <td class="mono">${t.resumeWeight.toFixed(4)}</td>
          <td class="mono">${t.jobWeight.toFixed(4)}</td>
          <td><span class="badge ${t.isSkill ? 'badge-info' : 'badge-pass'}">${t.isSkill ? 'Skill' : 'Other word'}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>7. Suggestions</h2>
  ${analysis.recommendations.map(r => `
    <div class="rec-box">
      <div class="rec-header">
        <span class="rec-title">[${r.type.toUpperCase()}] ${r.title}</span>
        <span class="badge badge-info">Resume section: ${r.targetSection}</span>
      </div>
      <div>${r.description}</div>
      <div class="rec-action">&rarr; Suggestion: ${r.suggestedAction}</div>
    </div>
  `).join('')}

  <h2>8. What the app can and cannot check</h2>
  <ul>
    <li><strong>Checked:</strong> Readable text, email and phone details, and skills from the job posting.</li>
    <li><strong>May be missed:</strong> Different wording for section headings and the order of text on the page.</li>
    <li><strong>Page layout:</strong> ${report?.formattingRisks.unverifiedLayoutNotice || 'The app cannot check columns, text boxes, or text inside images.'}</li>
  </ul>

  <div class="footer">
    AI ResumeMatch &bull; Resume analysis report
  </div>
</body>
</html>`;
}

/**
 * Triggers browser download of the Markdown report file.
 */
export function downloadMarkdownReport(analysis: AnalysisResult) {
  const content = generateMarkdownReport(analysis);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_ResumeMatch_Report_${analysis.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download of the self-contained HTML/PDF-ready report.
 */
export function downloadHtmlReport(analysis: AnalysisResult) {
  const content = generateHtmlReport(analysis);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_ResumeMatch_Report_${analysis.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download of complete JSON data.
 */
export function downloadJsonReport(analysis: AnalysisResult) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysis, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `AI_ResumeMatch_Data_${analysis.id}.json`;
  a.click();
}

/**
 * Opens a print-ready window with the formatted HTML report and triggers print.
 */
export function openPrintReport(analysis: AnalysisResult) {
  const html = generateHtmlReport(analysis);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
