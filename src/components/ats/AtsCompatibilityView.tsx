import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  HelpCircle,
  Info,
  Mail,
  Phone,
  Linkedin,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AnalysisResult, ActiveTab } from '../../types';
import { ScoreRing } from '../ui/ScoreRing';
import { Disclosure } from '../ui/Disclosure';
import { Button } from '../ui/Button';
import { cn } from '../../lib/ui';

interface AtsCompatibilityViewProps {
  analysis: AnalysisResult | null;
  onGoToAnalyze: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pass: 'Passed',
  warning: 'Needs attention',
  fail: 'Needs fixing',
  unverified: 'Could not verify',
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 shrink-0 text-coral-error" aria-hidden="true" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-warn" aria-hidden="true" />;
  return <HelpCircle className="h-4 w-4 shrink-0 text-silver" aria-hidden="true" />;
};

const EmptyPage: React.FC<{ title: string; description: string; onGoToAnalyze: () => void }> = ({
  title,
  description,
  onGoToAnalyze,
}) => (
  <div className="panel mx-auto max-w-xl px-6 py-12 text-center">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-mint/25 bg-mint/10 text-mint">
      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
    </div>
    <h2 className="font-heading text-base font-semibold text-porcelain">{title}</h2>
    <p className="mt-1.5 text-sm leading-relaxed text-silver">{description}</p>
    <Button variant="primary" size="md" className="mt-5" onClick={onGoToAnalyze}>
      Analyze My Resume
    </Button>
  </div>
);

export const AtsCompatibilityView: React.FC<AtsCompatibilityViewProps> = ({
  analysis,
  onGoToAnalyze,
  onTabChange,
}) => {
  if (!analysis) {
    return (
      <EmptyPage
        title="No ATS check yet"
        description="Run a comparison first and the ATS checks for that resume will appear here."
        onGoToAnalyze={onGoToAnalyze}
      />
    );
  }

  const report = analysis.atsCompatibilityReport;

  if (!report) {
    return (
      <EmptyPage
        title="No ATS report for this analysis"
        description="This saved comparison does not include ATS findings. Run the analysis again to generate them."
        onGoToAnalyze={onGoToAnalyze}
      />
    );
  }

  const checks = Array.isArray(report.checks) ? report.checks : [];
  const needsAttention = checks.filter(
    check => check.status === 'fail' || check.status === 'warning' || check.status === 'unverified'
  );
  const passed = checks.filter(check => check.status === 'pass');
  const sections = Array.isArray(report.sectionsDetected) ? report.sectionsDetected : [];

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const recommendations = (Array.isArray(report.recommendations) ? report.recommendations : [])
    .slice()
    .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  const atsScore = report.atsScore ?? analysis.atsReadabilityScore ?? 0;

  const contactRows = [
    {
      icon: Mail,
      label: 'Email address',
      value: report.contactDetails.emailFound
        ? report.contactDetails.emailAddress || 'Detected'
        : 'Not detected',
      ok: report.contactDetails.emailFound,
    },
    {
      icon: Phone,
      label: 'Phone number',
      value: report.contactDetails.phoneFound
        ? report.contactDetails.phoneNumber || 'Detected'
        : 'Not detected',
      ok: report.contactDetails.phoneFound,
    },
    {
      icon: Linkedin,
      label: 'LinkedIn profile',
      value: report.contactDetails.linkedinFound
        ? report.contactDetails.linkedinUrl || 'Detected'
        : 'Not detected (optional)',
      ok: report.contactDetails.linkedinFound,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            ATS check
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-silver">
            How easily an applicant tracking system can read this resume: contact details, standard
            sections, text extraction, and keyword alignment.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => onTabChange('results')}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Back to results
        </Button>
      </header>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-warn/25 bg-amber-warn/[0.06] p-3.5 text-xs leading-relaxed text-silver">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-warn" aria-hidden="true" />
        <span>
          This is an automated estimate based on the text that could be extracted from your resume.
          It is not an official score from Workday, Greenhouse, Taleo, or any other hiring platform.
        </span>
      </div>

      {/* Score summary */}
      <section className="panel p-5 sm:p-6" aria-labelledby="ats-score-heading">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <ScoreRing value={atsScore} label="ATS readability" size={168} tone="ion" />
          </div>
          <div>
            <h2 id="ats-score-heading" className="font-heading text-lg font-semibold text-porcelain">
              {atsScore >= 85
                ? 'This resume is easy for an ATS to read'
                : atsScore >= 70
                ? 'This resume is mostly readable, with a few gaps'
                : atsScore >= 50
                ? 'Several ATS issues could hide your details'
                : 'This resume may not parse reliably'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-silver">
              The score is built from contact details, standard section headings, formatting
              signals, and how well key terms line up with the job description.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Passed', value: report.passedChecks ?? 0, tone: 'text-mint' },
                { label: 'Warnings', value: report.warningChecks ?? 0, tone: 'text-amber-warn' },
                { label: 'Needs fixing', value: report.failedChecks ?? 0, tone: 'text-coral-error' },
                { label: 'Unverified', value: report.unverifiedChecks ?? 0, tone: 'text-silver' },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <dt className="text-[11px] text-silver">{item.label}</dt>
                  <dd className={cn('font-mono text-lg font-semibold tabular-nums', item.tone)}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* What to fix */}
      <section className="panel p-5 sm:p-6" aria-labelledby="ats-fixes-heading">
        <h2 id="ats-fixes-heading" className="font-heading text-base font-semibold text-porcelain">
          What to fix first
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Ordered by impact. Only change details that accurately describe you.
        </p>

        {recommendations.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {recommendations.map((item, index) => (
              <li
                key={`${item.issue}-${index}`}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-silver">{index + 1}.</span>
                  <h3 className="text-sm font-semibold text-porcelain">{item.issue}</h3>
                  <span
                    className={cn(
                      'tag',
                      item.priority === 'high'
                        ? 'tag-bad'
                        : item.priority === 'medium'
                        ? 'tag-warn'
                        : 'tag-mute'
                    )}
                  >
                    {item.priority === 'high' ? 'High priority' : item.priority === 'medium' ? 'Worth fixing' : 'Small improvement'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-porcelain">
                  <span className="font-semibold text-mint">What to do: </span>
                  {item.fix}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-silver">
                  <span className="font-semibold text-silver">Why: </span>
                  {item.reason}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-mint/25 bg-mint/[0.05] p-3 text-sm text-silver">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            No layout or readability changes are needed. This resume parses cleanly.
          </p>
        )}
      </section>

      {/* Checks needing attention */}
      <section className="panel p-5 sm:p-6" aria-labelledby="ats-checks-heading">
        <h2 id="ats-checks-heading" className="font-heading text-base font-semibold text-porcelain">
          Checks that need attention
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Items marked "could not verify" depend on visual layout that plain text cannot confirm.
        </p>

        {needsAttention.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {needsAttention.map(check => (
              <li
                key={check.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <StatusIcon status={check.status} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-porcelain">{check.title}</p>
                      <span className="tag tag-mute">{STATUS_LABEL[check.status] || check.status}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-silver">{check.message}</p>
                    {check.details && (
                      <p className="mt-1 break-words font-mono text-[11px] text-silver">{check.details}</p>
                    )}
                    {check.recommendation && (
                      <p className="mt-2 text-xs leading-relaxed text-porcelain">
                        <span className="font-semibold text-mint">Try this: </span>
                        {check.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-mint/25 bg-mint/[0.05] p-3 text-sm text-silver">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            Every check that could be evaluated passed.
          </p>
        )}
      </section>

      {/* Details */}
      <div className="space-y-3">
        <h2 className="px-1 font-heading text-base font-semibold text-porcelain">Details</h2>

        <Disclosure
          summary="Contact details and sections found"
          hint="What the parser could locate in the resume text."
        >
          <div className="space-y-4">
            <ul className="space-y-2">
              {contactRows.map(row => {
                const Icon = row.icon;
                return (
                  <li
                    key={row.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm text-porcelain">
                      <Icon className="h-4 w-4 text-silver" aria-hidden="true" />
                      {row.label}
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="max-w-[16rem] truncate text-silver">{row.value}</span>
                      <span className={cn('tag', row.ok ? 'tag-mint' : 'tag-mute')}>
                        {row.ok ? 'Found' : 'Missing'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-porcelain">
                <Layers className="h-4 w-4 text-silver" aria-hidden="true" />
                Standard sections
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sections.map(section => (
                  <li
                    key={section.sectionName}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <span className="text-porcelain">{section.sectionName}</span>
                    <span
                      className={cn(
                        'tag',
                        section.status === 'present'
                          ? 'tag-mint'
                          : section.status === 'alternative_present'
                          ? 'tag-cyan'
                          : 'tag-warn'
                      )}
                    >
                      {section.status === 'present'
                        ? 'Found'
                        : section.status === 'alternative_present'
                        ? 'Alternative found'
                        : 'Not found'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-silver">
                Missing optional sections are normal for students and early-career resumes.
              </p>
            </div>
          </div>
        </Disclosure>

        <Disclosure summary={`Passed checks (${passed.length})`} hint="Checks the resume already meets.">
          {passed.length > 0 ? (
            <ul className="space-y-2">
              {passed.map(check => (
                <li key={check.id} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-porcelain">{check.title}</p>
                    <p className="text-xs leading-relaxed text-silver">{check.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-silver">No checks passed yet. Start with the fixes above.</p>
          )}
        </Disclosure>

        <Disclosure summary="How the ATS score is built" hint="The four areas that make up the score.">
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              {
                label: 'Contact details',
                score: report.scoringBreakdown?.contactScore ?? 0,
                max: 20,
                description: 'Email, phone, and a professional profile link.',
              },
              {
                label: 'Standard sections',
                score: report.scoringBreakdown?.sectionsScore ?? 0,
                max: 30,
                description: 'Experience, skills, education, and projects headings.',
              },
              {
                label: 'Formatting and extractability',
                score: report.scoringBreakdown?.formattingScore ?? 0,
                max: 25,
                description: 'Text that can be extracted cleanly, without unusual glyphs or layout traps.',
              },
              {
                label: 'Keyword alignment',
                score: report.scoringBreakdown?.keywordScore ?? 0,
                max: 25,
                description: 'Presence of the job’s important terms in meaningful context.',
              },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-sm font-semibold text-porcelain">{item.label}</dt>
                  <dd className="font-mono text-xs text-silver">
                    {item.score} / {item.max}
                  </dd>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-silver">{item.description}</p>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-silver">
            Some items are marked as estimates or unverified because multi-column layouts, images,
            and scanned pages cannot be fully checked from extracted text alone.
          </p>
        </Disclosure>
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onTabChange('results')}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          Back to your results
        </Button>
        <Button variant="ghost" size="md" onClick={() => onTabChange('skills')}>
          Review skill gaps
        </Button>
      </div>
    </div>
  );
};

export default AtsCompatibilityView;
