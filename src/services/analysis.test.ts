import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResumeAndJob } from './nlpEngine';
import { validateDocumentFile, MAX_FILE_SIZE } from './fileValidation';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from '../data/sampleData';

const fakeFile = (name: string, size: number): File =>
  ({ name, size } as unknown as File);

test('a resume scores higher against its matching job description', () => {
  const resume = SAMPLE_RESUMES[0];
  const matchingJd = SAMPLE_JOB_DESCRIPTIONS[0];
  const unrelatedJd = SAMPLE_JOB_DESCRIPTIONS[2];

  const matching = analyzeResumeAndJob(resume.text, matchingJd.text, resume.title, matchingJd.title);
  const unrelated = analyzeResumeAndJob(resume.text, unrelatedJd.text, resume.title, unrelatedJd.title);

  assert.ok(matching.overallScore > unrelated.overallScore, 'expected the matching role to score higher');
  assert.ok(matching.matchedSkills.length > 0, 'expected at least one matched skill');
  assert.ok(matching.overallScore >= 0 && matching.overallScore <= 100);
  assert.ok(matching.cosineSimilarity >= 0 && matching.cosineSimilarity <= 100);
});

test('analysis always returns the arrays every results view renders', () => {
  const resume = SAMPLE_RESUMES[1];
  const jd = SAMPLE_JOB_DESCRIPTIONS[1];
  const result = analyzeResumeAndJob(resume.text, jd.text, resume.title, jd.title);

  assert.ok(Array.isArray(result.matchedSkills));
  assert.ok(Array.isArray(result.missingSkills));
  assert.ok(Array.isArray(result.categoryGaps));
  assert.ok(Array.isArray(result.topTermWeights));
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(result.atsCompatibilityReport, 'expected an ATS report for every analysis');
  assert.ok(result.atsCompatibilityReport?.checks.length);
});

test('upload validation rejects oversized, empty, and unsupported files', () => {
  assert.equal(validateDocumentFile(fakeFile('resume.pdf', 1024)).valid, true);
  assert.equal(validateDocumentFile(fakeFile('resume.docx', 2048)).valid, true);

  const empty = validateDocumentFile(fakeFile('resume.pdf', 0));
  assert.equal(empty.valid, false);
  assert.match(empty.error || '', /empty/i);

  const tooLarge = validateDocumentFile(fakeFile('resume.pdf', MAX_FILE_SIZE + 1));
  assert.equal(tooLarge.valid, false);
  assert.match(tooLarge.error || '', /10 MB/);

  const unsupported = validateDocumentFile(fakeFile('resume.png', 5000));
  assert.equal(unsupported.valid, false);
  assert.match(unsupported.error || '', /not supported/i);
});
