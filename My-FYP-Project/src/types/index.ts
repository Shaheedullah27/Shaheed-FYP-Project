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
  | 'history' 
  | 'dictionary'
  | 'backend-guide'
  | 'about';

export interface SampleDocument {
  id: string;
  title: string;
  subtitle: string;
  role: string;
  text: string;
  skillsCount: number;
}
