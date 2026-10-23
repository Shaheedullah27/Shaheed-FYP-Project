import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Info,
  CheckCircle2,
  FileText,
  Sparkles,
  ListChecks,
  Target,
  TrendingUp,
  Bot,
  MessageSquareQuote,
} from 'lucide-react';
import { AnalysisResult, ActiveTab, AiInsightSection, AiInsightsBlock } from '../../types';
import { downloadHtmlReport, downloadMarkdownReport } from '../../services/reportGenerator';
import { VersionContext } from '../../services/progress';
import { Button } from '../ui/Button';
import { Disclosure } from '../ui/Disclosure';
import { ScoreRing } from '../ui/ScoreRing';
import { cn, scoreTone, toneText, toneFill } from '../../lib/ui';

interface ResultsViewProps {
  analysis: AnalysisResult;
  onTabChange: (tab: ActiveTab) => void;
  onNewAnalysis: () => void;
  /** Explains a fallback, e.g. the backend was unavailable. */
  engineNotice?: string | null;
  /** Where this result sits among repeated analyses of the same role. */
  versionContext?: VersionContext | null;
  onOpenProgress?: () => void;
}

const matchLabel = (score: number) => {
  if (score >= 75) return 'Strong match';
  if (score >= 55) return 'Partial match';
  if (score >= 40) return 'Weak match';
  return 'Low match';
};

const matchToneClass = (score: number) =>
  score >= 75 ? 'tag-mint' : score >= 55 ? 'tag-cyan' : score >= 40 ? 'tag-warn' : 'tag-bad';

const AiInsightList: React.FC<{ section: AiInsightSection; tone: 'mint' | 'warn' | 'ion' }> = ({
  section,
  tone,
}) => {
  const toneClass = tone === 'mint' ? 'text-mint' : tone === 'warn' ? 'text-amber-warn' : 'text-ion';
  if (!section.items.length) {
    return (
      <p className="mt-1 text-xs text-silver">No specific items were returned for this section.</p>
    );
  }
  return (
    <ul className="mt-1.5 space-y-1.5">
      {section.items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-xs leading-relaxed text-silver">
          <span className={cn('mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current', toneClass)} />
          <span className="min-w-0">{item}</span>
        </li>
      ))
      }
    </ul>
  );
};

/**
 * Optional Gemini contextual insights. Never influences or replaces the
 * local numeric scores above; it is advisory commentary in its own panel.
 */
const AiInsightsPanel: React.FC<{ block: AiInsightsBlock }> = ({ block }) => {
  if (block.status === 'declined' || !block) return null;

  if (block.status !== 'available' || !block.insights) {
    return (
      <section
        className="panel p-5"
        aria-label="Optional AI insights"
      >
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
          <Bot className="h-4 w-4 text-silver" aria-hidden="true" />
          AI insights
        </h2>
        <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-silver" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-silver">
              {block.status === 'unavailable' || block.status === 'error'
                ? 'AI insights temporarily unavailable'
                : 'AI insights not generated'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-silver">
              {block.reason ||
                'The optional Gemini step did not return insights this run; the local analysis above is complete and unaffected.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const insights = block.insights;
  return (
    <section className="panel luxe-panel p-5 sm:p-6" aria-label="Optional AI insights from Gemini">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
          <Bot className="h-4 w-4 text-ion" aria-hidden="true" />
          AI insights from Gemini
        </h2>
        <span className="tag tag-cyan">AI insights available</span>
      </div>

      <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-ion" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-silver">Experience alignment</p>
          <p className="mt-0.5 text-xs leading-relaxed text-silver">{insights.experienceAlignment}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-mint">Strengths & transferable skills</h3>
          <AiInsightList section={insights.strengths} tone="mint" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-warn">Missing or weakly demonstrated skills</h3>
          <AiInsightList section={insights.skillGaps} tone="warn" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-porcelain">Prioritized improvements</h3>
          <AiInsightList section={insights.prioritizedImprovements} tone="ion" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-porcelain">ATS keywords from this posting</h3>
          <AiInsightList section={insights.atsKeywordRecommendations} tone="ion" />
        </div>
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold text-porcelain">Bullet point improvements</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-silver">
            Rewording suggestions for bullets already in your resume — they never invent new
            achievements, experience, qualifications, or metrics.
          </p>
          <AiInsightList section={insights.bulletPointImprovements} tone="ion" />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-silver">
        {block.aiDisclaimer ||
          'AI-generated assessment based only on the resume and job description provided. It is advisory text and does not change the local match scores shown above.'}
      </p>
    </section>
  );
};

const RECOMMENDATION_ORDER: Record<string, number> = {
  critical: 0,
  improvement: 1,
  strength: 2,
};

const versionMessage = (context: VersionContext): string => {
  if (context.currentNumber <= 1) {
    return context.total > 1
      ? `This is the first of ${context.total} analyses for this role. Open Progress to see how the score changed.`
      : `First saved analysis for “${context.jobTitle}”. Run this role again after changes to track your score.`;
  }

  const base = `Analysis ${context.currentNumber} of ${context.total} for this role`;
  if (context.delta === null) return `${base}.`;
  if (context.delta > 0) return `${base} — ${context.delta} points higher than your previous result.`;
  if (context.delta < 0) {
    return `${base} — ${Math.abs(context.delta)} points lower than your previous result.`;
  }
  return `${base} — the same score as your previous result.`;
};

export const ResultsView: React.FC<ResultsViewProps> = ({
  analysis,
  onTabChange,
  onNewAnalysis,
  engineNotice,
  versionContext,
  onOpenProgress,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState<'all' | 'skills' | 'keywords'>('all');

  const overallTone = scoreTone(analysis.overallScore);
  const report = analysis.atsCompatibilityReport;
  const atsScore = report?.atsScore ?? analysis.atsReadabilityScore;

  const sortedRecommendations = useMemo(
    () =>
      [...analysis.recommendations].sort(
        (a, b) => (RECOMMENDATION_ORDER[a.type] ?? 2) - (RECOMMENDATION_ORDER[b.type] ?? 2)
      ),
    [analysis.recommendations]
  );
  const improvements = sortedRecommendations.filter(item => item.type !== 'strength');
  const strengths = sortedRecommendations.filter(item => item.type === 'strength');

  const atsItems = useMemo(
    () =>
      (report?.checks || [])
        .filter(check => check.status === 'fail' || check.status === 'warning' || check.status === 'unverified')
        .slice(0, 3),
    [report]
  );

  const filteredTermWeights = analysis.topTermWeights.filter(term => {
    if (selectedTermFilter === 'skills') return term.isSkill;
    if (selectedTermFilter === 'keywords') return !term.isSkill;
    return true;
  });

  const copyReportSummary = async () => {
    const text = `AI ResumeMatch — comparison summary
Resume: ${analysis.resumeTitle}
Target role: ${analysis.jobTitle}
Overall match: ${analysis.overallScore}% (${matchLabel(analysis.overallScore)})
Text similarity: ${analysis.cosineSimilarity}%
Skill match: ${analysis.skillMatchScore}%
ATS readability: ${atsScore}%

Skills found in the resume (${analysis.matchedSkills.length}):
${analysis.matchedSkills.map(skill => `- ${skill.name}`).join('\n') || '- None'}

Skills requested but not found (${analysis.missingSkills.length}):
${analysis.missingSkills.map(skill => `- ${skill.name} (${skill.importance})`).join('\n') || '- None'}

What to improve:
${improvements.map(item => `- ${item.title}: ${item.suggestedAction}`).join('\n') || '- No changes suggested'}

These scores compare wording and skills in the two documents. They do not predict hiring outcomes.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const downloadReportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `ai-resumematch-${analysis.id}.json`);
    link.click();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Header + actions */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-silver">{analysis.timestamp} · Resume compared with a job description</p>
          <h2 className="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            {analysis.jobTitle}
          </h2>
          <p className="mt-0.5 truncate text-sm text-silver">
            {analysis.resumeTitle}
            {analysis.companyName ? ` · ${analysis.companyName}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => downloadHtmlReport(analysis)}
            leftIcon={<Download className="h-4 w-4" />}
            title="Download a full report you can print or save as PDF"
          >
            Download report
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onNewAnalysis}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Analyze another
          </Button>
        </div>
      </header>

      {engineNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-warn/25 bg-amber-warn/[0.06] p-3.5 text-xs leading-relaxed text-silver">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-warn" aria-hidden="true" />
          <span>{engineNotice}</span>
        </div>
      )}

      {versionContext && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-silver">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ion" aria-hidden="true" />
            <span>{versionMessage(versionContext)}</span>
          </p>
          {onOpenProgress && (
            <button
              type="button"
              onClick={onOpenProgress}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ion transition-colors hover:text-mint"
            >
              See progress
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* A. Overall match */}
      <section className="panel p-5 sm:p-6" aria-labelledby="overall-match-heading">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <ScoreRing value={analysis.overallScore} label="Overall match" size={172} />
          </div>

          <div className="min-w-0">
            <span className={cn('tag', matchToneClass(analysis.overallScore))}>
              {matchLabel(analysis.overallScore)}
            </span>
            <h2
              id="overall-match-heading"
              className="mt-2.5 font-heading text-lg font-semibold text-porcelain"
            >
              Your resume covers {analysis.overallScore}% of this job description
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-silver">
              This score combines how much the wording overlaps, how many required skills appear in
              your resume, how well key terms line up, and how easy the resume is for an ATS to read.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-silver">
              It is a text comparison, not a hiring probability or a guarantee of being shortlisted.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Wording overlap', value: analysis.cosineSimilarity },
                { label: 'Skills matched', value: analysis.skillMatchScore },
                { label: 'ATS readability', value: atsScore },
              ].map(metric => (
                <div key={metric.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <dt className="text-[11px] text-silver">{metric.label}</dt>
                  <dd className={cn('mt-0.5 font-mono text-lg font-semibold tabular-nums', toneText[scoreTone(metric.value)])}>
                    {Math.round(metric.value)}%
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Optional Gemini AI insights — explicit consent was required per-run */}
      {analysis.aiInsights ? (
        <AiInsightsPanel block={analysis.aiInsights} />
      ) : (
        <p className="px-1 text-xs text-silver">
          No AI insights were generated for this run. Enable “Add AI insights (optional)” on the
          analyze screen to include contextual Gemini commentary; the local analysis is complete
          without it.
        </p>
      )}

      {/* B + C. Matches and gaps */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="panel p-5" aria-labelledby="matches-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="matches-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
              <CheckCircle2 className="h-4 w-4 text-mint" aria-hidden="true" />
              What already matches
            </h2>
            <span className="font-mono text-xs text-silver">
              {analysis.matchedSkills.length} found
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver">
            Skills from the job description that also appear in your resume.
          </p>

          {analysis.matchedSkills.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {analysis.matchedSkills.slice(0, 10).map(skill => (
                <li
                  key={skill.name}
                  className="rounded-md border border-mint/25 bg-mint/10 px-2.5 py-1 text-xs font-medium text-mint"
                  title={`${skill.category} · ${skill.importance}`}
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-silver">
              No matching skills were detected. Add concrete tools and technologies you have really
              used to your resume.
            </p>
          )}

          {analysis.matchedSkills.length > 10 && (
            <Disclosure summary="All matched skills" count={analysis.matchedSkills.length} className="mt-4">
              <ul className="flex flex-wrap gap-1.5">
                {analysis.matchedSkills.map(skill => (
                  <li key={skill.name} className="rounded-md border border-mint/20 bg-mint/[0.06] px-2.5 py-1 text-xs text-silver">
                    {skill.name}
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}

          {strengths.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-3">
              {strengths.map(item => (
                <p key={item.id} className="text-xs leading-relaxed text-silver">
                  <span className="font-semibold text-mint">{item.title}. </span>
                  {item.description}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="gaps-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="gaps-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
              <AlertTriangle className="h-4 w-4 text-amber-warn" aria-hidden="true" />
              What is missing or unclear
            </h2>
            <span className="font-mono text-xs text-silver">
              {analysis.missingSkills.length} missing
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver">
            Requested requirements that were not found in your resume text.
          </p>

          {analysis.missingSkills.length > 0 ? (
            <>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {analysis.missingSkills.slice(0, 10).map(skill => (
                  <li
                    key={skill.name}
                    className="rounded-md border border-amber-warn/25 bg-amber-warn/10 px-2.5 py-1 text-xs font-medium text-amber-warn"
                    title={`${skill.category} · ${skill.importance}`}
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
              {analysis.missingSkills.length > 10 && (
                <Disclosure summary="All missing skills" count={analysis.missingSkills.length} className="mt-4">
                  <ul className="flex flex-wrap gap-1.5">
                    {analysis.missingSkills.map(skill => (
                      <li key={skill.name} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-silver">
                        {skill.name} · {skill.importance}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-silver">
              Every skill listed in the job description was found in your resume.
            </p>
          )}

          <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-silver">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-silver" aria-hidden="true" />
            Only add skills or experience you genuinely have. A gap is a chance to learn or clarify,
            not something to claim.
          </p>
        </section>
      </div>

      {/* D. How to improve */}
      <section className="panel p-5 sm:p-6" aria-labelledby="improve-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="improve-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
            <ListChecks className="h-4 w-4 text-ion" aria-hidden="true" />
            How to improve
          </h2>
          <span className="text-xs text-silver">Most useful first</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Practical changes for this specific job description.
        </p>

        {improvements.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {improvements.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border p-4',
                  item.type === 'critical'
                    ? 'border-coral-error/25 bg-coral-error/[0.05]'
                    : 'border-white/[0.08] bg-white/[0.02]'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[11px] font-semibold text-silver">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-porcelain">{item.title}</h3>
                      <span className="tag tag-mute">{item.targetSection}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-silver">
                      <span className="font-semibold text-silver">Why it matters: </span>
                      {item.description}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-porcelain">
                      <span className="font-semibold text-mint">What to do: </span>
                      {item.suggestedAction}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 rounded-xl border border-mint/25 bg-mint/[0.05] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-porcelain">
              <CheckCircle2 className="h-4 w-4 text-mint" aria-hidden="true" />
              No urgent changes found
            </p>
            <p className="mt-1 text-xs leading-relaxed text-silver">
              Keep the resume aligned with the role, and make sure each claim is specific and
              accurate.
            </p>
          </div>
        )}
      </section>

      {/* E. ATS compatibility */}
      <section className="panel p-5 sm:p-6" aria-labelledby="ats-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="ats-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
              <ShieldCheck className="h-4 w-4 text-ion" aria-hidden="true" />
              ATS compatibility
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-silver">
              Checks whether contact details, standard sections, and readable text can be found by
              an applicant tracking system. This is an estimate, not an official score from any
              hiring platform.
            </p>
          </div>
          <div className="text-right">
            <span className={cn('font-mono text-2xl font-semibold tabular-nums', toneText[scoreTone(atsScore)])}>
              {atsScore}%
            </span>
            <span className="block text-[11px] text-silver">estimated readability</span>
          </div>
        </div>

        {atsItems.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {atsItems.map(check => (
              <li key={check.id} className="flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-warn" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-porcelain">{check.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-silver">{check.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/[0.05] p-3 text-xs text-silver">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            No parsing problems were found in the checks that could be verified.
          </p>
        )}

        <Button
          variant="secondary"
          size="md"
          className="mt-4"
          onClick={() => onTabChange('ats-checker')}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Open full ATS report
        </Button>
      </section>

      {/* F. Detailed information */}
      <div className="space-y-3">
        <h2 className="px-1 font-heading text-base font-semibold text-porcelain">Detailed information</h2>

        <Disclosure
          summary="Skill matches by category"
          hint="See which areas are strong and which need attention."
          count={analysis.categoryGaps.length}
        >
          <div className="space-y-4">
            {analysis.categoryGaps.map(category => (
              <div key={category.category}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-porcelain">{category.category}</span>
                  <span className="font-mono text-xs font-semibold text-silver">{category.matchPercentage}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={cn('h-full rounded-full', toneFill[scoreTone(category.matchPercentage)])}
                    style={{ width: `${category.matchPercentage}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-silver">
                  {category.matchedCount} of {category.totalRequired} found
                  {category.missingSkills.length > 0
                    ? ` · not found: ${category.missingSkills.join(', ')}`
                    : ' · nothing missing'}
                </p>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => onTabChange('skills')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Open skill gap details
          </Button>
        </Disclosure>

        <Disclosure
          summary="Important words in each document"
          hint="Which words and phrases carried the most weight in the comparison."
          lazy
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-silver">Showing the ten highest-weighted terms.</p>
            <div className="seg" role="group" aria-label="Filter terms">
              {(['all', 'skills', 'keywords'] as const).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedTermFilter(filter)}
                  data-active={selectedTermFilter === filter}
                  className="seg-btn"
                >
                  {filter === 'all' ? 'All words' : filter === 'skills' ? 'Skills' : 'Other words'}
                </button>
              ))}
            </div>
          </div>

          <div
            className="h-64 w-full"
            role="img"
            aria-label="Bar chart comparing term weights in the resume and job description"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredTermWeights.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 24 }}>
                <XAxis
                  dataKey="term"
                  tick={{ fontSize: 11, fill: 'var(--color-silver)' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  axisLine={{ stroke: 'var(--theme-border-strong)' }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-silver)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(241,235,221,0.05)' }}
                  contentStyle={{
                    backgroundColor: 'var(--color-graphite)',
                    borderColor: 'var(--theme-border-strong)',
                    borderRadius: '8px',
                    color: 'var(--color-porcelain)',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'var(--color-mint)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--color-porcelain)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'var(--color-silver)' }} />
                <Bar dataKey="resumeWeight" name="Resume" fill="var(--color-mint)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobWeight" name="Job description" fill="var(--color-ion)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Disclosure>

        <Disclosure summary="How the score is calculated" hint="The method behind the numbers, in plain terms.">
          <dl className="space-y-3 text-xs leading-relaxed text-silver">
            <div>
              <dt className="font-semibold text-porcelain">1. Word frequency</dt>
              <dd>Words that appear more often count more, with diminishing returns so repetition cannot inflate the score.</dd>
            </div>
            <div>
              <dt className="font-semibold text-porcelain">2. Term importance</dt>
              <dd>Words that are rare across documents weigh more than common words found everywhere.</dd>
            </div>
            <div>
              <dt className="font-semibold text-porcelain">3. Overall score</dt>
              <dd>
                Text similarity × 0.40 + skills × 0.35 + keyword alignment × 0.15 + ATS readability ×
                0.10.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-porcelain">Limits</dt>
              <dd>
                A lexical comparison cannot judge the quality of your experience, seniority, or
                whether a recruiter will advance your application.
              </dd>
            </div>
          </dl>
        </Disclosure>

        <Disclosure summary="Report options" hint="Download or copy this analysis.">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadHtmlReport(analysis)}
              leftIcon={<FileText className="h-3.5 w-3.5" />}
            >
              HTML report (print to PDF)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadMarkdownReport(analysis)}
              leftIcon={<FileText className="h-3.5 w-3.5" />}
            >
              Text report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyReportSummary}
              leftIcon={copied ? <Check className="h-3.5 w-3.5 text-mint" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Summary copied' : 'Copy summary'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadReportJson}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              JSON data
            </Button>
          </div>
        </Disclosure>
      </div>

      <p className="flex items-start gap-2 px-1 pb-2 text-[11px] leading-relaxed text-silver">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Tip: run the same job description again after editing your resume to see whether the match
        score improves.
      </p>
    </div>
  );
};

export default ResultsView;
