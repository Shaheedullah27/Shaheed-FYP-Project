export type SkillCategory = 
  | 'Programming Languages'
  | 'Databases & Storage'
  | 'Web Development'
  | 'Project Management'
  | 'Marketing & Analytics'
  | 'Communication & Interpersonal'
  | 'Cloud & DevOps';

export interface SkillItem {
  name: string;
  category: SkillCategory;
  importance: 'Required' | 'Preferred' | 'Bonus';
  frequencyInJD: number;
  foundInResume: boolean;
  contextSnippet?: string;
}

export interface CategoryGap {
  category: SkillCategory;
  totalRequired: number;
  matchedCount: number;
  missingCount: number;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface TermWeight {
  term: string;
  resumeWeight: number;
  jobWeight: number;
  isSkill: boolean;
}

export interface AnalysisRecommendation {
  id: string;
  type: 'critical' | 'improvement' | 'strength';
  title: string;
  description: string;
  suggestedAction: string;
  targetSection: 'Skills' | 'Experience' | 'Education' | 'Summary';
}

export interface AtsCheckItem {
  id: string;
  category: 'text_extraction' | 'contact_info' | 'sections' | 'formatting_risk' | 'keyword_alignment';
  title: string;
  status: 'pass' | 'warning' | 'fail' | 'unverified';
  verificationLevel: 'verified' | 'approximate' | 'unverified';
  message: string;
  details?: string;
  recommendation?: string;
}

export interface AtsSectionDetection {
  sectionName: string;
  detected: boolean;
  headerFound?: string;
  isOptionalForStudents: boolean;
  status: 'present' | 'missing' | 'alternative_present';
  explanation: string;
}

export interface AtsCompatibilityReport {
  atsScore: number; // 0 to 100
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  unverifiedChecks: number;
  textExtractionStatus: {
    wordCount: number;
    characterCount: number;
    isExtractable: boolean;
    potentialMisorderingWarning: boolean;
  };
  contactDetails: {
    emailFound: boolean;
    emailAddress?: string;
    phoneFound: boolean;
    phoneNumber?: string;
    linkedinFound: boolean;
    linkedinUrl?: string;
    locationFound: boolean;
  };
  sectionsDetected: AtsSectionDetection[];
  formattingRisks: {
    hasSpecialCharacters: boolean;
    excessiveBulletPoints: boolean;
    lineLengthIssues: boolean;
    unusualSectionHeadings: string[];
    unverifiedLayoutNotice: string;
  };
  checks: AtsCheckItem[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    issue: string;
    fix: string;
    reason: string;
  }[];
  scoringBreakdown: {
    contactScore: number; // max 20
    sectionsScore: number; // max 30
    formattingScore: number; // max 25
    keywordScore: number; // max 25
  };
  disclaimer: string;
}

export interface AiInsightSection {
  title: string;
  items: string[];
}

export interface GeminiInsights {
  /** How well the resume experience maps to the job description. */
  experienceAlignment: string;
  /** Relevant strengths and transferable skills. */
  strengths: AiInsightSection;
  /** Missing or weakly demonstrated skills. */
  skillGaps: AiInsightSection;
  /** Ranked resume-improvement suggestions, most impactful first. */
  prioritizedImprovements: AiInsightSection;
  /** ATS keywords grounded in the provided job description. */
  atsKeywordRecommendations: AiInsightSection;
  /** Wording-level improvements for existing bullets (never invented facts). */
  bulletPointImprovements: AiInsightSection;
}

export type AiInsightsStatus = 'available' | 'unavailable' | 'error' | 'declined';

export interface AiInsightsBlock {
  status: AiInsightsStatus;
  insights?: GeminiInsights | null;
  /** User-facing explanation when insights are not available. */
  reason?: string;
  /** Gemini model id that produced the insights, when available. */
  model?: string;
  /** Advisory disclaimer shown under AI sections. */
  aiDisclaimer?: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  resumeTitle: string;
  candidateName?: string;
  jobTitle: string;
  companyName?: string;
  
  // Numerical Metrics
  cosineSimilarity: number; // 0 to 100
  skillMatchScore: number;  // 0 to 100
  keywordDensityScore: number; // 0 to 100
  atsReadabilityScore: number; // 0 to 100 (basic)
  overallScore: number;     // weighted composite 0 to 100

  // Detailed Analysis
  wordCountResume: number;
  wordCountJD: number;
  matchedSkills: SkillItem[];
  missingSkills: SkillItem[];
  categoryGaps: CategoryGap[];
  topTermWeights: TermWeight[];
  recommendations: AnalysisRecommendation[];
  
  // Dedicated ATS Compatibility Report
  atsCompatibilityReport?: AtsCompatibilityReport;

  // Optional Gemini AI contextual insights. Explicitly consented per-run on
  // the analyze form; absent when declined, unconfigured, or failed.
  aiInsights?: AiInsightsBlock | null;

  // Raw / Processed Text
  resumeText: string;
  jobDescriptionText: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  resumeTitle: string;
  candidateName?: string;
  jobTitle: string;
  companyName?: string;
  overallScore: number;
  cosineSimilarity: number;
  atsScore?: number;
  matchedSkillCount: number;
  missingSkillCount: number;
  topMissingSkill: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'analyze' 
  | 'results' 
  | 'skills' 
  | 'ats-checker'
  | 'security'
  | 'history' 
  | 'progress'
  | 'dictionary'
  | 'backend-guide'
  | 'about'
  | 'settings';

export interface SampleDocument {
  id: string;
  title: string;
  subtitle: string;
  role: string;
  text: string;
  skillsCount: number;
}

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SecurityConfidence = 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW';
export type QuarantineStatus = 'NOT_QUARANTINED' | 'FLAGGED_FOR_REVIEW' | 'QUARANTINED' | 'CLEARED' | 'REJECTED';
export type ReviewerStatus = 'unreviewed' | 'under_review' | 'confirmed' | 'false_positive' | 'cleared';

export interface SecurityFinding {
  id: string;
  inspection_id: string;
  resume_id?: string;
  rule_id: string;
  category: string;
  severity: SecuritySeverity;
  confidence: SecurityConfidence;
  title: string;
  description: string;
  snippet: string;
  page_number: number;
  bbox?: number[];
  font_name?: string;
  font_size?: number;
  font_color?: string;
  background_color?: string;
  visibility_evidence?: string;
  reviewer_status: ReviewerStatus;
  reviewer_notes?: string;
  created_at: string;
  filename?: string;
  candidate_name?: string;
  job_title?: string;
  quarantine_status?: QuarantineStatus;
  risk_level?: string;
  detection_details?: Record<string, any>;
  completed_steps?: string[];
  failed_steps?: string[];
}

export interface SecuritySummary {
  total_inspected: number;
  clean_count: number;
  flagged_count: number;
  quarantined_count: number;
  critical_high_count: number;
  incomplete_count: number;
  recent_alerts: Array<{
    id: string;
    inspection_id: string;
    rule_id: string;
    title: string;
    severity: SecuritySeverity;
    confidence: SecurityConfidence;
    snippet: string;
    page_number: number;
    filename: string;
    candidate_name: string;
    quarantine_status: QuarantineStatus;
    created_at: string;
  }>;
}

export interface SecurityInspection {
  id: string;
  resume_id: string;
  filename: string;
  file_type: string;
  candidate_name: string;
  job_title: string;
  inspection_status: 'completed' | 'incomplete' | 'failed';
  risk_level: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  quarantine_status: QuarantineStatus;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  completed_steps: string[];
  failed_steps: string[];
  summary_notes: string;
  created_at: string;
  updated_at: string;
  findings?: SecurityFinding[];
}

export interface SecurityAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  reason?: string;
  details_json?: string;
}
