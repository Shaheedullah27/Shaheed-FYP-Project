import { AnalysisResult, HistoryItem } from '../types';
import { INITIAL_HISTORY, SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from '../data/sampleData';
import { analyzeResumeAndJob } from './nlpEngine';

const HISTORY_KEY = 'ai_resumematch_history';
const ACTIVE_ANALYSIS_KEY = 'ai_resumematch_active_analysis';

export function getStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load history from localStorage', e);
    return INITIAL_HISTORY;
  }
}

export function saveAnalysisToHistory(analysis: AnalysisResult): HistoryItem {
  const history = getStoredHistory();
  const topMissing = analysis.missingSkills.length > 0 ? analysis.missingSkills[0].name : 'None';
  
  const newItem: HistoryItem = {
    id: analysis.id,
    timestamp: analysis.timestamp,
    resumeTitle: analysis.resumeTitle,
    jobTitle: analysis.jobTitle,
    overallScore: analysis.overallScore,
    cosineSimilarity: analysis.cosineSimilarity,
    atsScore: analysis.atsCompatibilityReport?.atsScore || analysis.atsReadabilityScore,
    matchedSkillCount: analysis.matchedSkills.length,
    missingSkillCount: analysis.missingSkills.length,
    topMissingSkill: topMissing
  };

  const updated = [newItem, ...history.filter(h => h.id !== newItem.id)].slice(0, 50);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(analysis));
    // Also save individual analysis record for retrieval
    localStorage.setItem(`analysis_record_${analysis.id}`, JSON.stringify(analysis));
  } catch (e) {
    console.warn('Storage quota reached, trimmed history', e);
  }

  return newItem;
}

export function deleteHistoryItem(id: string): HistoryItem[] {
  const history = getStoredHistory();
  const updated = history.filter(h => h.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    localStorage.removeItem(`analysis_record_${id}`);
  } catch (e) {
    console.error('Failed to delete history item', e);
  }
  return updated;
}

export function getActiveAnalysis(): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getAnalysisById(id: string): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(`analysis_record_${id}`);
    if (raw) return JSON.parse(raw);
    const active = getActiveAnalysis();
    if (active && active.id === id) return active;

    // Fallback resolution for pre-seeded benchmark history records
    if (id === 'hist-1' || id === 'hist-2' || id === 'hist-3') {
      let resIdx = 0;
      let jdIdx = 0;
      let ts = '2026-10-18 14:32';

      if (id === 'hist-2') {
        resIdx = 1;
        jdIdx = 1;
        ts = '2026-10-17 11:15';
      } else if (id === 'hist-3') {
        resIdx = 0;
        jdIdx = 2;
        ts = '2026-10-15 09:40';
      }

      if (SAMPLE_RESUMES[resIdx] && SAMPLE_JOB_DESCRIPTIONS[jdIdx]) {
        const generated = analyzeResumeAndJob(
          SAMPLE_RESUMES[resIdx].text,
          SAMPLE_JOB_DESCRIPTIONS[jdIdx].text,
          SAMPLE_RESUMES[resIdx].title,
          SAMPLE_JOB_DESCRIPTIONS[jdIdx].title
        );
        generated.id = id;
        generated.timestamp = ts;
        try {
          localStorage.setItem(`analysis_record_${id}`, JSON.stringify(generated));
        } catch (e) {
          // Ignore storage quota
        }
        return generated;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function exportHistoryAsJson(): string {
  const history = getStoredHistory();
  return JSON.stringify(history, null, 2);
}
