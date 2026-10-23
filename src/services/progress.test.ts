import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisResult, HistoryItem } from '../types';
import {
  buildRoleProgress,
  deriveJobTitle,
  getVersionContext,
  normalizeRoleTitle,
} from './progress';

const historyItem = (overrides: Partial<HistoryItem> & Pick<HistoryItem, 'id' | 'timestamp' | 'overallScore'>): HistoryItem => ({
  resumeTitle: 'Resume',
  jobTitle: 'Full Stack Engineer',
  matchedSkillCount: 5,
  missingSkillCount: 2,
  topMissingSkill: 'Docker',
  cosineSimilarity: 70,
  ...overrides,
});

const analysisWith = (id: string, jobTitle: string, overallScore: number): AnalysisResult =>
  ({ id, jobTitle, overallScore } as unknown as AnalysisResult);

const history: HistoryItem[] = [
  historyItem({ id: 'a1', timestamp: '2026-10-01 09:00', overallScore: 70, jobTitle: 'Full-Stack Engineer' }),
  historyItem({ id: 'a2', timestamp: '2026-10-10 09:00', overallScore: 80, jobTitle: 'full stack engineer' }),
  historyItem({ id: 'b1', timestamp: '2026-10-05 09:00', overallScore: 60, jobTitle: 'DevOps Engineer' }),
  historyItem({ id: 'g1', timestamp: '2026-10-02 09:00', overallScore: 50, jobTitle: 'Target role' }),
  historyItem({ id: 'g2', timestamp: '2026-10-03 09:00', overallScore: 55, jobTitle: 'Target role' }),
];

test('analyses are grouped by normalized job title, newest first', () => {
  const roles = buildRoleProgress(history);
  const fullStack = roles.find(role => role.key === 'full stack engineer');

  assert.ok(fullStack, 'expected the full stack role group');
  assert.equal(fullStack.count, 2);
  assert.equal(fullStack.latest.id, 'a2');
  assert.equal(fullStack.delta, 10);
  assert.equal(fullStack.bestScore, 80);

  // Newest group first.
  assert.equal(roles[0].latest.id, 'a2');
});

test('placeholder job titles are never merged into one role', () => {
  const roles = buildRoleProgress(history);
  const genericGroups = roles.filter(role => role.jobTitle === 'Target role');

  assert.equal(genericGroups.length, 2);
  assert.ok(genericGroups.every(role => role.count === 1 && role.delta === null));
  assert.equal(normalizeRoleTitle('Full-Stack  Engineer!'), 'full stack engineer');
});

test('version context reports position and change for saved and unsaved results', () => {
  const saved = getVersionContext(analysisWith('a2', 'Full Stack Engineer', 80), history);
  assert.equal(saved.currentNumber, 2);
  assert.equal(saved.total, 2);
  assert.equal(saved.previousScore, 70);
  assert.equal(saved.delta, 10);

  const unsaved = getVersionContext(analysisWith('new-run', 'Full Stack Engineer', 75), history);
  assert.equal(unsaved.currentNumber, 3);
  assert.equal(unsaved.total, 3);
  assert.equal(unsaved.previousScore, 80);
  assert.equal(unsaved.delta, -5);

  const first = getVersionContext(analysisWith('first', 'New Role', 65), []);
  assert.equal(first.currentNumber, 1);
  assert.equal(first.delta, null);
});

test('job titles are derived from the posting when the field is blank', () => {
  assert.equal(deriveJobTitle('Job Title: Senior Data Engineer\nCompany: Acme'), 'Senior Data Engineer');
  assert.equal(
    deriveJobTitle('Senior Backend Developer\nLocation: Remote\nRequirements'),
    'Senior Backend Developer'
  );
  assert.equal(deriveJobTitle(''), null);
});
