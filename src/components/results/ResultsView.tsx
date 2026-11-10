import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Sparkles,
  ListChecks,
  Target,
  ShieldCheck,
  Tags,
  Gauge,
} from 'lucide-react';
import type { AnalysisResult, KeywordMatch } from '../../types';
import { Button } from '../ui/Button';
import { Disclosure } from '../ui/Disclosure';
import { ScoreRing } from '../ui/ScoreRing';
import { cn, scoreTone, toneFill, toneText } from '../../lib/ui';

interface ResultsViewProps {
  analysis: AnalysisResult;
  onNewAnalysis: () => void;
}

const KeywordChips: React.FC<{
  items: KeywordMatch[];
  tone: 'mint' | 'warn' | 'ion';
  emptyText: string;
  mode: 'job' | 'resume';
}> = ({ items, tone, emptyText, mode }) => {
  if (items.length === 0) {
    return <p className="mt-3 text-sm leading-relaxed text-silver">{emptyText}</p>;
  }

  const chipClass =
    tone === 'mint'
      ? 'border-mint/25 bg-mint/10 text-mint'
      : tone === 'warn'
        ? 'border-amber-warn/25 bg-amber-warn/10 text-amber-warn'
        : 'border-ion/25 bg-ion/10 text-ion';

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map(item => (
        <li
          key={item.keyword}
          className={cn('rounded-md border px-2.5 py-1 text-xs font-medium', chipClass)}
          title={
            mode === 'job'
              ? `${item.category} · mentioned ${item.jobFrequency} ${
                  item.jobFrequency === 1 ? 'time' : 'times'
                } in the job description`
              : `${item.category} · found ${item.resumeFrequency} ${
                  item.resumeFrequency === 1 ? 'time' : 'times'
                } in your resume`
          }
        >
          {item.keyword}
        </li>
      ))}
    </ul>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ analysis, onNewAnalysis }) => {
  const reduced = useReducedMotion();
  const coverageTone = scoreTone(analysis.keywordCoverage);

  const matchedPreview = analysis.matchedKeywords.slice(0, 12);
  const missingPreview = analysis.missingKeywords.slice(0, 12);
  const resumePreview = analysis.resumeKeywords.slice(0, 16);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-silver">
            {analysis.timestamp} · Resume compared with a job description
          </p>
          <h2 className="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            {analysis.jobTitle}
          </h2>
          <p className="mt-0.5 truncate text-sm text-silver">{analysis.resumeTitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onNewAnalysis}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Analyze another resume
          </Button>
        </div>
      </header>

      {/* A. Resume match percentage */}
      <section className="panel p-5 sm:p-6" aria-labelledby="match-heading">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <ScoreRing value={analysis.matchPercentage} label="Resume–job match" size={172} />
          </div>

          <div className="min-w-0">
            <span className="tag tag-cyan">TF-IDF cosine similarity</span>
            <h2
              id="match-heading"
              className="mt-2.5 font-heading text-lg font-semibold text-porcelain"
            >
              Your resume has an estimated {analysis.matchPercentage}% text match with this job
              description
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-silver">
              This is the cosine similarity between the TF-IDF vectors of your resume and the job
              description. It reflects shared vocabulary and phrasing between the two documents;
              relevant experience written with different wording can produce a moderate value.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-silver">
              The score is not calibrated against hiring outcomes. It is not a hiring probability,
              a quality judgment, or a guarantee of being shortlisted.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Resume words', value: analysis.resumeWordCount, suffix: '' },
                { label: 'Job words', value: analysis.jobDescriptionWordCount, suffix: '' },
                { label: 'Job keywords', value: analysis.jobKeywordCount, suffix: '' },
              ].map(metric => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
                >
                  <dt className="text-[11px] text-silver">{metric.label}</dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-porcelain">
                    {metric.value}
                    {metric.suffix}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* B + C. Matched and missing keywords */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="panel p-5" aria-labelledby="matched-heading">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="matched-heading"
              className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain"
            >
              <CheckCircle2 className="h-4 w-4 text-mint" aria-hidden="true" />
              Matched keywords
            </h2>
            <span className="font-mono text-xs text-silver">
              {analysis.matchedKeywords.length} found
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver">
            Job keywords that also appear in your resume.
          </p>

          <KeywordChips
            items={matchedPreview}
            tone="mint"
            mode="job"
            emptyText={
              analysis.jobKeywordCount === 0
                ? 'No dictionary keywords were identified in the job description, so there is nothing to match.'
                : 'None of the identified job keywords were found in your resume text.'
            }
          />

          {analysis.matchedKeywords.length > matchedPreview.length && (
            <Disclosure
              summary="All matched keywords"
              count={analysis.matchedKeywords.length}
              className="mt-4"
            >
              <KeywordChips
                items={analysis.matchedKeywords}
                tone="mint"
                mode="job"
                emptyText="No matched keywords."
              />
            </Disclosure>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="missing-heading">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="missing-heading"
              className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain"
            >
              <AlertTriangle className="h-4 w-4 text-amber-warn" aria-hidden="true" />
              Missing keywords
            </h2>
            <span className="font-mono text-xs text-silver">
              {analysis.missingKeywords.length} missing
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver">
            Job keywords that were not detected in your resume.
          </p>

          <KeywordChips
            items={missingPreview}
            tone="warn"
            mode="job"
            emptyText={
              analysis.jobKeywordCount === 0
                ? 'No dictionary keywords were identified in the job description.'
                : 'Every identified job keyword appears in your resume.'
            }
          />

          {analysis.missingKeywords.length > missingPreview.length && (
            <Disclosure
              summary="All missing keywords"
              count={analysis.missingKeywords.length}
              className="mt-4"
            >
              <KeywordChips
                items={analysis.missingKeywords}
                tone="warn"
                mode="job"
                emptyText="No missing keywords."
              />
            </Disclosure>
          )}

          <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-silver">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-silver" aria-hidden="true" />
            Only add skills or experience you genuinely have. A gap is a chance to learn or clarify,
            not something to claim.
          </p>
        </section>
      </div>

      {/* C. Resume keywords */}
      <section className="panel p-5" aria-labelledby="resume-keywords-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="resume-keywords-heading"
              className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain"
            >
              <Tags className="h-4 w-4 text-ion" aria-hidden="true" />
              Keywords found in your resume
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-silver">
              Dictionary keywords detected in your resume, whether or not this job asks for them.
            </p>
          </div>
          <span className="font-mono text-xs text-silver">
            {analysis.resumeKeywords.length} detected
          </span>
        </div>

        <KeywordChips
          items={resumePreview}
          tone="ion"
          mode="resume"
          emptyText="No dictionary keywords were detected in the resume text. Add tools, languages and skills you genuinely have."
        />

        {analysis.resumeKeywords.length > resumePreview.length && (
          <Disclosure
            summary="All resume keywords"
            count={analysis.resumeKeywords.length}
            className="mt-4"
          >
            <KeywordChips
              items={analysis.resumeKeywords}
              tone="ion"
              mode="resume"
              emptyText="No resume keywords."
            />
          </Disclosure>
        )}
      </section>

      {/* D. Basic ATS keyword coverage */}
      <section className="panel p-5 sm:p-6" aria-labelledby="coverage-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="coverage-heading"
              className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain"
            >
              <ShieldCheck className="h-4 w-4 text-ion" aria-hidden="true" />
              Basic ATS keyword coverage
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-silver">
              Keyword coverage = matched job keywords ÷ total identified job keywords × 100. This is
              a basic keyword check, not an official ATS score or a simulation of Workday,
              Greenhouse, Taleo, or any other hiring platform.
            </p>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'font-mono text-2xl font-semibold tabular-nums',
                toneText[coverageTone]
              )}
            >
              {analysis.keywordCoverage}%
            </span>
            <span className="block text-[11px] text-silver">
              {analysis.matchedKeywordCount} of {analysis.jobKeywordCount} job keywords
            </span>
          </div>
        </div>

        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={analysis.keywordCoverage}
          aria-label="Job keyword coverage"
        >
          <motion.div
            className={cn('h-full rounded-full', toneFill[coverageTone])}
            initial={{ width: reduced ? `${analysis.keywordCoverage}%` : 0 }}
            animate={{ width: `${analysis.keywordCoverage}%` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {analysis.jobKeywordCount === 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-warn/25 bg-amber-warn/[0.06] p-3 text-xs leading-relaxed text-silver">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-warn" aria-hidden="true" />
            No known dictionary keywords were found in the job description, so coverage is shown as
            0% rather than dividing by zero. Paste a more complete posting to get a useful check.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-mint/20 bg-mint/[0.04] p-3">
              <p className="text-[11px] font-semibold text-mint">Found in resume</p>
              <p className="mt-1 text-xs leading-relaxed text-silver">
                {analysis.matchedKeywords.map(item => item.keyword).join(', ') || 'None'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-warn/20 bg-amber-warn/[0.04] p-3">
              <p className="text-[11px] font-semibold text-amber-warn">Not found</p>
              <p className="mt-1 text-xs leading-relaxed text-silver">
                {analysis.missingKeywords.map(item => item.keyword).join(', ') || 'None'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* E. Rule-based suggestions */}
      <section className="panel p-5 sm:p-6" aria-labelledby="suggestions-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="suggestions-heading"
            className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain"
          >
            <ListChecks className="h-4 w-4 text-ion" aria-hidden="true" />
            Improvement suggestions
          </h2>
          <span className="text-xs text-silver">Based on this comparison</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Practical, rule-based next steps. These suggestions never invent experience,
          qualifications, certifications, or skills.
        </p>

        {analysis.suggestions.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {analysis.suggestions.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border p-4',
                  index === 0
                    ? 'border-mint/25 bg-mint/[0.04]'
                    : 'border-white/[0.08] bg-white/[0.02]'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[11px] font-semibold text-silver">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-porcelain">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-silver">{item.description}</p>
                    <p className="mt-2 text-sm leading-relaxed text-porcelain">
                      <span className="font-semibold text-mint">What to do: </span>
                      {item.action}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-silver">
            No suggestions were generated for this comparison.
          </p>
        )}
      </section>

      {/* Methodology */}
      <Disclosure
        summary="How this result is calculated"
        hint="The method behind the numbers, in plain terms."
      >
        <dl className="space-y-3 text-xs leading-relaxed text-silver">
          <div>
            <dt className="font-semibold text-porcelain">1. TF-IDF text similarity</dt>
            <dd>
              Words that appear often in a document gain weight, but very common words are reduced.
              The resume and job description become vectors, and cosine similarity measures the
              angle between them. The result is multiplied by 100 and rounded to one decimal place.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-porcelain">2. Keyword identification</dt>
            <dd>
              Keywords come from a maintained skills dictionary with aliases, not from every word in
              the posting. Capitalisation and duplicates are normalised before comparison.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-porcelain">3. Keyword coverage</dt>
            <dd>
              Coverage = matched job keywords ÷ total identified job keywords × 100. If the job
              description contains no known keywords, coverage is reported as 0% instead of
              dividing by zero.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-porcelain">Limitations</dt>
            <dd>
              A lexical comparison cannot judge the quality, seniority, or truthfulness of your
              experience. It does not predict hiring outcomes and is not an official ATS score.
            </dd>
          </div>
        </dl>
      </Disclosure>

      {/* F. Start another analysis */}
      <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
          <div>
            <h2 className="font-heading text-base font-semibold text-porcelain">
              Compare another version
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-silver">
              Edit your resume or try a different job description to see what changes.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={onNewAnalysis}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Analyze another resume
        </Button>
      </section>

      <p className="flex items-start gap-2 px-1 pb-2 text-[11px] leading-relaxed text-silver">
        <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {analysis.disclaimer}
      </p>
    </div>
  );
};

export default ResultsView;
