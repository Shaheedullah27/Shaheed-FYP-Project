import { AnalysisResult, AtsCompatibilityReport, AtsSectionDetection } from '../types';
import { analyzeResumeAndJob } from './nlpEngine';
import { evaluateAtsCompatibility } from './atsChecker';

export interface BackendStatus {
  connected: boolean;
  endpoint: string;
  version?: string;
  mode: 'browser' | 'flask';
}

const FLASK_URL_KEY = 'ai_resumematch_flask_url';
const MODE_KEY = 'ai_resumematch_engine_mode';

/**
 * Shape of the ATS report returned by the Flask API. It matches the frontend
 * report except for a few presentation fields the backend does not compute:
 * formatting risks, per-section explanations, and the location flag.
 */
type RawFlaskReport = Omit<
  AtsCompatibilityReport,
  'formattingRisks' | 'sectionsDetected' | 'contactDetails'
> & {
  contactDetails: Omit<AtsCompatibilityReport['contactDetails'], 'locationFound'> & {
    locationFound?: boolean;
  };
  sectionsDetected: Array<Omit<AtsSectionDetection, 'explanation'> & { explanation?: string }>;
  formattingRisks?: AtsCompatibilityReport['formattingRisks'];
};

/**
 * Completes a Flask ATS report with the fields only the frontend renders.
 * Missing values are computed with the same local heuristics the browser
 * engine uses, so both engine modes render identical reports from the same
 * text, and report generation never crashes on a partial backend payload.
 */
function normalizeFlaskReport(
  raw: RawFlaskReport | undefined,
  resumeText: string,
  jobDescriptionText: string,
  missingSkillNames: string[]
): AtsCompatibilityReport | undefined {
  if (!raw) return undefined;
  const local = evaluateAtsCompatibility(resumeText, jobDescriptionText, missingSkillNames);
  const sectionExplanations = new Map(local.sectionsDetected.map(s => [s.sectionName, s.explanation]));
  return {
    ...local,
    ...raw,
    formattingRisks: raw.formattingRisks ?? local.formattingRisks,
    contactDetails: {
      ...raw.contactDetails,
      locationFound: raw.contactDetails.locationFound ?? local.contactDetails.locationFound,
    },
    sectionsDetected: raw.sectionsDetected.map(s => ({
      ...s,
      explanation:
        s.explanation ??
        sectionExplanations.get(s.sectionName) ??
        (s.status === 'present'
          ? 'Section heading found in the extracted text.'
          : s.status === 'alternative_present'
            ? 'An alternative section was found in place of this heading.'
            : 'This section heading was not found in the extracted text.'),
    })),
  };
}

export function getEngineMode(): 'browser' | 'flask' {
  return (localStorage.getItem(MODE_KEY) as 'browser' | 'flask') || 'browser';
}

export function setEngineMode(mode: 'browser' | 'flask') {
  localStorage.setItem(MODE_KEY, mode);
}

export function getFlaskUrl(): string {
  return localStorage.getItem(FLASK_URL_KEY) || 'http://localhost:5000';
}

export function setFlaskUrl(url: string) {
  localStorage.setItem(FLASK_URL_KEY, url);
}

export async function checkFlaskHealth(): Promise<{ connected: boolean; version?: string; error?: string }> {
  const url = getFlaskUrl();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { connected: true, version: data.version || '1.0.0' };
    }
    return { connected: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Cannot reach Flask server' };
  }
}

/**
 * Executes resume analysis, routing to Flask if mode is 'flask' and connected,
 * otherwise executing our local explainable NLP math engine.
 */
export async function runAnalysis(
  resumeText: string,
  jobDescriptionText: string,
  resumeTitle: string = 'Uploaded Resume',
  jobTitle: string = 'Target Position'
): Promise<{ result: AnalysisResult; source: 'flask' | 'browser' }> {
  const mode = getEngineMode();
  const flaskUrl = getFlaskUrl();

  if (mode === 'flask') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${flaskUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescriptionText,
          resume_title: resumeTitle,
          job_title: jobTitle
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        // Convert Flask payload snake_case to AnalysisResult format
        const result: AnalysisResult = {
          id: data.id || `analysis-${Date.now()}`,
          timestamp: data.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 16),
          resumeTitle: data.resume_title || resumeTitle,
          jobTitle: data.job_title || jobTitle,
          cosineSimilarity: data.cosine_similarity,
          skillMatchScore: data.skill_match_score,
          keywordDensityScore: data.keyword_density_score || 80,
          atsReadabilityScore: data.ats_readability_score || 85,
          overallScore: data.overall_score,
          wordCountResume: data.word_count_resume,
          wordCountJD: data.word_count_jd,
          matchedSkills: data.matched_skills || [],
          missingSkills: data.missing_skills || [],
          categoryGaps: data.category_gaps || [],
          topTermWeights: data.top_term_weights || [],
          recommendations: data.recommendations || [],
          atsCompatibilityReport: normalizeFlaskReport(
            data.ats_compatibility_report as RawFlaskReport | undefined,
            resumeText,
            jobDescriptionText,
            (data.missing_skills || []).map((s: { name?: string }) => s?.name).filter((n?: string): n is string => Boolean(n))
          ),
          resumeText,
          jobDescriptionText
        };
        return { result, source: 'flask' };
      }
    } catch (err) {
      console.warn('Flask server unavailable or timed out, falling back to local NLP engine', err);
    }
  }

  // Fallback to local explainable NLP Engine
  const result = analyzeResumeAndJob(resumeText, jobDescriptionText, resumeTitle, jobTitle);
  return { result, source: 'browser' };
}
