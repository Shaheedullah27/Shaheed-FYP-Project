import { getSkillsDictionary, STOP_WORDS, SkillDefinition } from '../data/skillsDictionary';
import { evaluateAtsCompatibility } from './atsChecker';
import { 
  AnalysisResult, 
  SkillItem, 
  CategoryGap, 
  TermWeight, 
  AnalysisRecommendation,
  SkillCategory 
} from '../types';

/**
 * Tokenizes text into normalized words and n-grams
 */
export function tokenizeText(text: string, includeBigrams: boolean = true): string[] {
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
  
  if (!includeBigrams) {
    return words;
  }

  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }
  return tokens;
}

/**
 * Computes TF-IDF vectors and Cosine Similarity between Resume and Job Description
 * Identical mathematical formula to scikit-learn's TfidfVectorizer(smooth_idf=True, norm='l2', sublinear_tf=True)
 */
export function computeTfIdfCosineSimilarity(
  resumeTokens: string[], 
  jdTokens: string[]
): {
  similarity: number;
  termWeights: TermWeight[];
} {
  const allTokens = new Set([...resumeTokens, ...jdTokens]);
  const vocabulary = Array.from(allTokens);
  const N = 2; // Two documents: Resume (doc 0) and JD (doc 1)

  // Document frequencies
  const df: Record<string, number> = {};
  const tfResume: Record<string, number> = {};
  const tfJd: Record<string, number> = {};

  for (const token of resumeTokens) {
    tfResume[token] = (tfResume[token] || 0) + 1;
  }
  for (const token of jdTokens) {
    tfJd[token] = (tfJd[token] || 0) + 1;
  }

  for (const term of vocabulary) {
    let count = 0;
    if (tfResume[term]) count++;
    if (tfJd[term]) count++;
    df[term] = count;
  }

  // Calculate TF-IDF vectors
  // IDF with smooth_idf: ln((1 + N) / (1 + df)) + 1
  const idf: Record<string, number> = {};
  for (const term of vocabulary) {
    idf[term] = Math.log((1 + N) / (1 + df[term])) + 1.0;
  }

  const vResume: Record<string, number> = {};
  const vJd: Record<string, number> = {};

  let normResumeSq = 0;
  let normJdSq = 0;

  for (const term of vocabulary) {
    // sublinear tf: 1 + log(tf) if tf > 0 else 0
    const rawTfRes = tfResume[term] || 0;
    const sublinearTfRes = rawTfRes > 0 ? (1 + Math.log(rawTfRes)) : 0;
    const tfidfRes = sublinearTfRes * idf[term];
    vResume[term] = tfidfRes;
    normResumeSq += tfidfRes * tfidfRes;

    const rawTfJd = tfJd[term] || 0;
    const sublinearTfJd = rawTfJd > 0 ? (1 + Math.log(rawTfJd)) : 0;
    const tfidfJd = sublinearTfJd * idf[term];
    vJd[term] = tfidfJd;
    normJdSq += tfidfJd * tfidfJd;
  }

  const normResume = Math.sqrt(normResumeSq);
  const normJd = Math.sqrt(normJdSq);

  if (normResume === 0 || normJd === 0) {
    return { similarity: 0, termWeights: [] };
  }

  // Dot product of L2 normalized vectors
  let dotProduct = 0;
  const termWeightsList: TermWeight[] = [];

  const currentSkills = getSkillsDictionary();
  const skillNames = new Set(currentSkills.map(s => s.name.toLowerCase()));

  for (const term of vocabulary) {
    const l2Res = vResume[term] / normResume;
    const l2Jd = vJd[term] / normJd;
    dotProduct += l2Res * l2Jd;

    // Keep terms with notable presence in either document
    if (l2Res > 0.04 || l2Jd > 0.04) {
      termWeightsList.push({
        term,
        resumeWeight: parseFloat(l2Res.toFixed(4)),
        jobWeight: parseFloat(l2Jd.toFixed(4)),
        isSkill: skillNames.has(term.toLowerCase())
      });
    }
  }

  // Sort top terms by combined relevance
  termWeightsList.sort((a, b) => (b.jobWeight + b.resumeWeight) - (a.jobWeight + a.resumeWeight));

  const similarityScore = Math.min(100, Math.max(0, Math.round(dotProduct * 100 * 10) / 10));

  return {
    similarity: similarityScore,
    termWeights: termWeightsList.slice(0, 20)
  };
}

/**
 * Extracts skills mentioned in Job Description and checks presence in Resume
 */
export function extractAndCompareSkills(
  resumeText: string, 
  jdText: string
): {
  matchedSkills: SkillItem[];
  missingSkills: SkillItem[];
  categoryGaps: CategoryGap[];
  skillMatchScore: number;
} {
  const normResume = ' ' + resumeText.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ') + ' ';
  const normJd = ' ' + jdText.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ') + ' ';

  const matchedSkills: SkillItem[] = [];
  const missingSkills: SkillItem[] = [];

  const currentDictionary = getSkillsDictionary();

  const categories: SkillCategory[] = [
    'Programming Languages',
    'Databases & Storage',
    'Web Development',
    'Project Management',
    'Marketing & Analytics',
    'Communication & Interpersonal',
    'Cloud & DevOps'
  ];

  const categoryMap: Record<SkillCategory, { matched: string[]; missing: string[] }> = {
    'Programming Languages': { matched: [], missing: [] },
    'Databases & Storage': { matched: [], missing: [] },
    'Web Development': { matched: [], missing: [] },
    'Project Management': { matched: [], missing: [] },
    'Marketing & Analytics': { matched: [], missing: [] },
    'Communication & Interpersonal': { matched: [], missing: [] },
    'Cloud & DevOps': { matched: [], missing: [] }
  };

  for (const skill of currentDictionary) {
    const searchTerms = [skill.name.toLowerCase(), ...(skill.aliases || []).map(a => a.toLowerCase())];
    
    // Check if skill is mentioned in Job Description
    let inJd = false;
    let freqInJd = 0;
    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = normJd.match(regex);
      if (matches && matches.length > 0) {
        inJd = true;
        freqInJd += matches.length;
      }
    }

    if (!inJd) {
      continue; // Skill not required by this job description
    }

    // Check if skill is in Resume
    let inResume = false;
    let snippet = '';
    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const match = normResume.match(regex);
      if (match) {
        inResume = true;
        const index = normResume.indexOf(term);
        const start = Math.max(0, index - 25);
        const end = Math.min(normResume.length, index + term.length + 25);
        snippet = '...' + normResume.slice(start, end).trim() + '...';
        break;
      }
    }

    let importance: 'Required' | 'Preferred' | 'Bonus' = 'Required';
    if (freqInJd === 1 && !normJd.includes('required') && !normJd.includes('must have')) {
      importance = 'Preferred';
    }

    const item: SkillItem = {
      name: skill.name,
      category: skill.category,
      importance,
      frequencyInJD: freqInJd,
      foundInResume: inResume,
      contextSnippet: snippet || undefined
    };

    if (inResume) {
      matchedSkills.push(item);
      if (categoryMap[skill.category]) {
        categoryMap[skill.category].matched.push(skill.name);
      }
    } else {
      missingSkills.push(item);
      if (categoryMap[skill.category]) {
        categoryMap[skill.category].missing.push(skill.name);
      }
    }
  }

  // Sort missing skills by frequency in JD
  missingSkills.sort((a, b) => b.frequencyInJD - a.frequencyInJD);
  matchedSkills.sort((a, b) => b.frequencyInJD - a.frequencyInJD);

  // Compile Category Gaps
  const categoryGaps: CategoryGap[] = categories.map(cat => {
    const matched = categoryMap[cat]?.matched || [];
    const missing = categoryMap[cat]?.missing || [];
    const total = matched.length + missing.length;
    const matchPercentage = total > 0 ? Math.round((matched.length / total) * 100) : 100;
    
    return {
      category: cat,
      totalRequired: total,
      matchedCount: matched.length,
      missingCount: missing.length,
      matchPercentage,
      matchedSkills: matched,
      missingSkills: missing
    };
  }).filter(c => c.totalRequired > 0);

  const totalRequiredSkills = matchedSkills.length + missingSkills.length;
  const skillMatchScore = totalRequiredSkills > 0 
    ? Math.round((matchedSkills.length / totalRequiredSkills) * 100) 
    : 75;

  return {
    matchedSkills,
    missingSkills,
    categoryGaps,
    skillMatchScore
  };
}

/**
 * Calculates ATS readability and structural score based on resume composition
 */
export function evaluateAtsReadability(resumeText: string): number {
  let score = 50;
  const lower = resumeText.toLowerCase();

  // Has standard section headers
  if (lower.includes('experience') || lower.includes('work history')) score += 12;
  if (lower.includes('education') || lower.includes('degree')) score += 12;
  if (lower.includes('skills') || lower.includes('technical competencies')) score += 12;
  if (lower.includes('summary') || lower.includes('about')) score += 5;

  // Contact info cues
  if (lower.includes('@') && lower.includes('.com')) score += 5;
  if (/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(resumeText)) score += 4;

  const wordCount = resumeText.trim().split(/\s+/).length;
  if (wordCount >= 250 && wordCount <= 1200) {
    // Ideal length
  } else if (wordCount < 200) {
    score -= 15;
  }

  return Math.min(100, Math.max(30, score));
}

/**
 * Generates tailored, actionable resume improvement suggestions
 */
export function generateRecommendations(
  missingSkills: SkillItem[],
  categoryGaps: CategoryGap[],
  cosineSimilarity: number,
  atsScore: number
): AnalysisRecommendation[] {
  const recs: AnalysisRecommendation[] = [];

  // Critical skill gaps
  const highPriorityMissing = missingSkills.filter(s => s.importance === 'Required').slice(0, 3);
  if (highPriorityMissing.length > 0) {
    const names = highPriorityMissing.map(s => s.name).join(', ');
    recs.push({
      id: 'rec-critical-skills',
      type: 'critical',
      title: `Job skills not found: ${names}`,
      description: `The job posting mentions ${names}, but they were not found in your resume.`,
      suggestedAction: `If you have used ${names}, add examples to your resume, such as a project, course, or certificate.`,
      targetSection: 'Skills'
    });
  }

  // Category specific weaknesses
  const lowestCategory = [...categoryGaps].sort((a, b) => a.matchPercentage - b.matchPercentage)[0];
  if (lowestCategory && lowestCategory.matchPercentage < 60 && lowestCategory.missingSkills.length > 0) {
    recs.push({
      id: 'rec-category-gap',
      type: 'improvement',
      title: `Add skills in ${lowestCategory.category}`,
      description: `These skills were not found in your resume: ${lowestCategory.missingSkills.slice(0, 4).join(', ')}.`,
      suggestedAction: `If you have experience with ${lowestCategory.missingSkills.slice(0, 2).join(' and ')}, describe it in your resume.`,
      targetSection: 'Experience'
    });
  }

  // Compare the wording in the resume and job posting.
  if (cosineSimilarity < 65) {
    recs.push({
      id: 'rec-semantic-phrasing',
      type: 'improvement',
      title: 'Use wording from the job posting',
      description: `The text match is ${cosineSimilarity}%. Different terms may lower the score, even when your experience is relevant.`,
      suggestedAction: 'Use the job posting’s terms when they accurately describe your experience (for example, "REST APIs" if that is what you worked with).',
      targetSection: 'Summary'
    });
  } else {
    recs.push({
      id: 'rec-strength-alignment',
      type: 'strength',
      title: 'Your wording matches the job posting',
      description: `Your resume and the job posting use many of the same words (${cosineSimilarity}% text match).`,
      suggestedAction: 'Keep the relevant wording and add numbers to describe your results where possible.',
      targetSection: 'Experience'
    });
  }

  // ATS formatting check
  if (atsScore < 85) {
    recs.push({
      id: 'rec-ats-structure',
      type: 'improvement',
      title: 'Use clear section headings',
      description: 'Hiring software may have trouble finding information under unusual headings or in complex layouts.',
      suggestedAction: 'Use headings like "Work Experience", "Education", "Skills", and "Projects". Keep important text out of images and text boxes.',
      targetSection: 'Education'
    });
  }

  return recs;
}

/**
 * Main full analysis execution function
 */
export function analyzeResumeAndJob(
  resumeText: string,
  jobDescriptionText: string,
  resumeTitle: string = 'Candidate Resume',
  jobTitle: string = 'Target Position'
): AnalysisResult {
  const resumeTokens = tokenizeText(resumeText, true);
  const jdTokens = tokenizeText(jobDescriptionText, true);

  const wordCountResume = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const wordCountJD = jobDescriptionText.trim().split(/\s+/).filter(Boolean).length;

  // Cosine Similarity + TF-IDF Top Term Weights
  const { similarity: cosineSimilarity, termWeights: topTermWeights } = 
    computeTfIdfCosineSimilarity(resumeTokens, jdTokens);

  // Skill Taxonomy Comparison
  const { matchedSkills, missingSkills, categoryGaps, skillMatchScore } = 
    extractAndCompareSkills(resumeText, jobDescriptionText);

  // ATS Readability & Comprehensive Compatibility Audit
  const missingSkillNames = missingSkills.map(s => s.name);
  const atsCompatibilityReport = evaluateAtsCompatibility(resumeText, jobDescriptionText, missingSkillNames);
  const atsReadabilityScore = atsCompatibilityReport.atsScore;

  // Keyword Density Score (overlap ratio of non-stopword unigrams)
  const unigramResume = new Set(tokenizeText(resumeText, false));
  const unigramJd = tokenizeText(jobDescriptionText, false);
  const matchedUnigramCount = unigramJd.filter(t => unigramResume.has(t)).length;
  const keywordDensityScore = unigramJd.length > 0 
    ? Math.round(Math.min(100, (matchedUnigramCount / unigramJd.length) * 140)) 
    : 70;

  // Composite Weighted Score
  // 40% Cosine Similarity + 35% Skill Match + 15% Keyword Density + 10% ATS Structure
  const overallScore = Math.round(
    (cosineSimilarity * 0.40) + 
    (skillMatchScore * 0.35) + 
    (keywordDensityScore * 0.15) + 
    (atsReadabilityScore * 0.10)
  );

  // Recommendations
  const recommendations = generateRecommendations(
    missingSkills, 
    categoryGaps, 
    cosineSimilarity, 
    atsReadabilityScore
  );

  return {
    id: `analysis-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    resumeTitle,
    jobTitle,
    cosineSimilarity,
    skillMatchScore,
    keywordDensityScore,
    atsReadabilityScore,
    overallScore,
    wordCountResume,
    wordCountJD,
    matchedSkills,
    missingSkills,
    categoryGaps,
    topTermWeights,
    recommendations,
    atsCompatibilityReport,
    resumeText,
    jobDescriptionText
  };
}
