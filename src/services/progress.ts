import { AnalysisResult, HistoryItem } from '../types';

export interface RoleProgress {
  key: string;
  jobTitle: string;
  companyName?: string;
  /** Newest first. */
  items: HistoryItem[];
  latest: HistoryItem;
  previous?: HistoryItem;
  /** Points changed versus the previous run, or null for a first run. */
  delta: number | null;
  bestScore: number;
  count: number;
}

export interface VersionContext {
  jobTitle: string;
  /** 1-based position among the runs for this role. */
  currentNumber: number;
  total: number;
  previousScore: number | null;
  delta: number | null;
}

const GENERIC_TITLES = new Set([
  '',
  'target role',
  'target position',
  'untitled',
  'untitled role',
  'role',
  'unknown',
  'n a',
]);

/** Lowercase, punctuation-free comparison key for a job title. */
export function normalizeRoleTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const isGenericTitle = (normalized: string) => GENERIC_TITLES.has(normalized);

const timestampValue = (value: string): number => {
  const parsed = Date.parse(value.replace(' ', 'T'));
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Newest first, with a stable fallback when timestamps are missing. */
const compareNewestFirst = (a: HistoryItem, b: HistoryItem): number => {
  const difference = timestampValue(b.timestamp) - timestampValue(a.timestamp);
  if (difference !== 0) return difference;
  return b.timestamp.localeCompare(a.timestamp);
};

const roleKeyFor = (item: HistoryItem): string => {
  const normalized = normalizeRoleTitle(item.jobTitle);
  // Without a meaningful title, keep the run separate so unrelated roles are
  // never presented as versions of one another.
  return isGenericTitle(normalized) ? `solo:${item.id}` : normalized;
};

/**
 * Groups saved analyses by job title and returns the newest-first timeline for
 * each role. History is the single source of truth — no extra storage is used.
 */
export function buildRoleProgress(history: HistoryItem[]): RoleProgress[] {
  const groups = new Map<string, HistoryItem[]>();

  for (const item of history) {
    const key = roleKeyFor(item);
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort(compareNewestFirst);
      const latest = sorted[0];
      const previous = sorted[1];
      const companyName = latest.companyName || sorted.find(item => item.companyName)?.companyName;

      return {
        key,
        jobTitle: latest.jobTitle || 'Untitled role',
        companyName,
        items: sorted,
        latest,
        previous,
        delta: previous ? Math.round(latest.overallScore - previous.overallScore) : null,
        bestScore: Math.max(...sorted.map(item => item.overallScore)),
        count: sorted.length,
      } satisfies RoleProgress;
    })
    .sort((a, b) => compareNewestFirst(a.latest, b.latest));
}

/**
 * Where the active analysis sits in its role's timeline, so results can show
 * "run 2 of 3, +4 points" without any extra persistence.
 */
export function getVersionContext(analysis: AnalysisResult, history: HistoryItem[]): VersionContext {
  const normalized = normalizeRoleTitle(analysis.jobTitle);

  if (isGenericTitle(normalized)) {
    return {
      jobTitle: analysis.jobTitle,
      currentNumber: 1,
      total: 1,
      previousScore: null,
      delta: null,
    };
  }

  const sameRole = history
    .filter(item => normalizeRoleTitle(item.jobTitle) === normalized)
    .sort((a, b) => compareNewestFirst(b, a)); // oldest first

  const index = sameRole.findIndex(item => item.id === analysis.id);

  if (index === -1) {
    // The active result is not in the saved history (for example it was run in
    // an older session). Compare it with the latest saved run for this role.
    const previous = sameRole[sameRole.length - 1];
    return {
      jobTitle: analysis.jobTitle,
      currentNumber: sameRole.length + 1,
      total: sameRole.length + 1,
      previousScore: previous?.overallScore ?? null,
      delta: previous ? Math.round(analysis.overallScore - previous.overallScore) : null,
    };
  }

  const previous = sameRole[index - 1];
  return {
    jobTitle: analysis.jobTitle,
    currentNumber: index + 1,
    total: sameRole.length,
    previousScore: previous?.overallScore ?? null,
    delta: previous ? Math.round(analysis.overallScore - previous.overallScore) : null,
  };
}

const cleanTitle = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s*[|·]\s*.*$/, '')
    .trim()
    .slice(0, 90);

/**
 * Pulls a useful role label out of a job description when the user leaves the
 * optional job-title field empty. This keeps history and progress grouped
 * sensibly instead of every run becoming "Target role".
 */
export function deriveJobTitle(jobDescriptionText: string): string | null {
  const text = jobDescriptionText || '';

  const explicit = text.match(/^\s*(?:job\s*title|position|role)\s*[:\-–]\s*(.+)$/im);
  const explicitTitle = explicit ? cleanTitle(explicit[1]) : '';
  if (explicitTitle.length >= 2) return explicitTitle;

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const firstUseful = lines.find(
    line =>
      line.length >= 3 &&
      line.length <= 90 &&
      !line.endsWith(':') &&
      !/^(about|company|location|employment|department|salary)\b/i.test(line)
  );

  return firstUseful ? cleanTitle(firstUseful) || null : null;
}
