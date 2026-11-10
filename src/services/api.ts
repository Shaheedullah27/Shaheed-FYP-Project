import type {
  AnalysisResult,
  ImprovementSuggestion,
  KeywordMatch,
} from '../types';

/** Flask backend address. Override with VITE_API_URL for a different host/port. */
export const API_BASE_URL =
  ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000').replace(
    /\/+$/,
    ''
  );

export interface ExtractionResult {
  filename: string;
  wordCount: number;
  text: string;
}

interface ApiErrorBody {
  error?: unknown;
}

const NETWORK_MESSAGE = `Could not reach the Python backend at ${API_BASE_URL}. Start it with "python app.py" in the backend folder, then try again.`;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clampPercent = (value: unknown): number =>
  Math.min(100, Math.max(0, asNumber(value)));

function mapKeywords(raw: unknown): KeywordMatch[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): KeywordMatch[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const keyword = typeof record.keyword === 'string' ? record.keyword.trim() : '';
    if (!keyword) return [];

    return [
      {
        keyword,
        category:
          typeof record.category === 'string' && record.category.trim()
            ? record.category
            : 'General',
        jobFrequency: asNumber(record.job_frequency),
        resumeFrequency: asNumber(record.resume_frequency),
      },
    ];
  });
}

function mapSuggestions(raw: unknown): ImprovementSuggestion[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): ImprovementSuggestion[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) return [];

    return [
      {
        id:
          typeof record.id === 'string' && record.id
            ? record.id
            : `suggestion-${title.slice(0, 24)}`,
        title,
        description:
          typeof record.description === 'string' ? record.description.trim() : '',
        action: typeof record.action === 'string' ? record.action.trim() : '',
      },
    ];
  });
}

/** Fetch JSON, turn backend errors into readable Error messages. */
async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(NETWORK_MESSAGE);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Keep body null; the status-based message below is still useful.
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && typeof (body as ApiErrorBody).error === 'string'
        ? (body as { error: string }).error
        : `The backend returned an error (HTTP ${response.status}). Please try again.`;
    throw new Error(message);
  }

  return body as T;
}

/** Upload a PDF/DOCX and receive the text extracted by the Flask backend. */
export async function extractResumeText(file: File): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const data = await fetchJson<{
    filename?: unknown;
    word_count?: unknown;
    extracted_text?: unknown;
  }>(`${API_BASE_URL}/api/extract-resume`, {
    method: 'POST',
    body: formData,
  });

  const text = typeof data.extracted_text === 'string' ? data.extracted_text : '';
  if (!text.trim()) {
    throw new Error(
      'No readable text was returned from this document. Try a PDF with selectable text or a DOCX file.'
    );
  }

  return {
    filename: typeof data.filename === 'string' ? data.filename : file.name,
    wordCount: asNumber(data.word_count, text.split(/\s+/).filter(Boolean).length),
    text,
  };
}

export interface AnalyzeResumeInput {
  resumeText: string;
  jobDescription: string;
  resumeTitle?: string;
  jobTitle?: string;
}

/** Run the real TF-IDF / keyword comparison on the Flask backend. */
export async function analyzeResume({
  resumeText,
  jobDescription,
  resumeTitle = 'Uploaded resume',
  jobTitle = 'Target role',
}: AnalyzeResumeInput): Promise<AnalysisResult> {
  const data = await fetchJson<Record<string, unknown>>(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jobDescription,
      resume_title: resumeTitle,
      job_title: jobTitle,
    }),
  });

  return {
    id: typeof data.id === 'string' ? data.id : `analysis-${Date.now()}`,
    timestamp:
      typeof data.timestamp === 'string'
        ? data.timestamp
        : new Date().toISOString().replace('T', ' ').slice(0, 16),
    resumeTitle:
      typeof data.resume_title === 'string' ? data.resume_title : resumeTitle,
    jobTitle: typeof data.job_title === 'string' ? data.job_title : jobTitle,
    matchPercentage: clampPercent(data.match_percentage),
    keywordCoverage: clampPercent(data.keyword_coverage),
    jobKeywordCount: asNumber(data.job_keyword_count),
    matchedKeywordCount: asNumber(data.matched_keyword_count),
    matchedKeywords: mapKeywords(data.matched_keywords),
    missingKeywords: mapKeywords(data.missing_keywords),
    resumeKeywords: mapKeywords(data.resume_keywords),
    resumeWordCount: asNumber(data.resume_word_count),
    jobDescriptionWordCount: asNumber(data.job_description_word_count),
    suggestions: mapSuggestions(data.suggestions),
    disclaimer:
      typeof data.disclaimer === 'string'
        ? data.disclaimer
        : 'Scores describe text similarity and keyword coverage, not hiring probability or an official ATS score.',
  };
}
