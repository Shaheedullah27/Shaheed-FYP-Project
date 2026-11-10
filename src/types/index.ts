export type ActiveTab = 'home' | 'analyze' | 'results' | 'how-it-works' | 'about';

/** A dictionary keyword detected in the job description and/or resume. */
export interface KeywordMatch {
  keyword: string;
  category: string;
  /** Number of occurrences in the job description. */
  jobFrequency: number;
  /** Number of occurrences in the resume. */
  resumeFrequency: number;
}

/** A rule-based, non-generative improvement suggestion. */
export interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
}

/**
 * Result of a real TF-IDF comparison. There is intentionally no composite
 * "overall score" and no ATS compatibility score in this simplified project.
 */
export interface AnalysisResult {
  id: string;
  timestamp: string;
  resumeTitle: string;
  jobTitle: string;

  /** TF-IDF cosine similarity, 0–100. Text similarity, not hiring probability. */
  matchPercentage: number;

  /** Matched job keywords / total identified job keywords, 0–100. */
  keywordCoverage: number;
  jobKeywordCount: number;
  matchedKeywordCount: number;

  matchedKeywords: KeywordMatch[];
  missingKeywords: KeywordMatch[];
  resumeKeywords: KeywordMatch[];

  resumeWordCount: number;
  jobDescriptionWordCount: number;

  suggestions: ImprovementSuggestion[];
  disclaimer: string;
}

export interface SampleDocument {
  id: string;
  title: string;
  subtitle: string;
  role: string;
  text: string;
  skillsCount: number;
}
