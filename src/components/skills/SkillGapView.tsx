import React from 'react';
import { Target, CheckCircle2, ArrowRight, BookOpen, Info, Sparkles } from 'lucide-react';
import { AnalysisResult, ActiveTab, SkillItem } from '../../types';
import { Disclosure } from '../ui/Disclosure';
import { Button } from '../ui/Button';
import { cn, scoreTone, toneText, toneFill } from '../../lib/ui';

interface SkillGapViewProps {
  analysis: AnalysisResult | null;
  onGoToAnalyze: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

const IMPORTANCE_ORDER: Record<SkillItem['importance'], number> = {
  Required: 0,
  Preferred: 1,
  Bonus: 2,
};

const importanceClass = (importance: SkillItem['importance']) =>
  importance === 'Required' ? 'tag-cyan' : importance === 'Preferred' ? 'tag-warn' : 'tag-mute';

export const SkillGapView: React.FC<SkillGapViewProps> = ({
  analysis,
  onGoToAnalyze,
  onTabChange,
}) => {
  if (!analysis) {
    return (
      <div className="panel mx-auto max-w-xl px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-mint/25 bg-mint/10 text-mint">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-base font-semibold text-porcelain">No skill gaps yet</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-silver">
          Run a comparison and the skills found in your resume, plus the ones the job asks for, will
          appear here.
        </p>
        <Button variant="primary" size="md" className="mt-5" onClick={onGoToAnalyze}>
          Analyze My Resume
        </Button>
      </div>
    );
  }

  const totalSkills = analysis.matchedSkills.length + analysis.missingSkills.length;
  const missing = [...analysis.missingSkills].sort(
    (a, b) =>
      (IMPORTANCE_ORDER[a.importance] ?? 3) - (IMPORTANCE_ORDER[b.importance] ?? 3) ||
      b.frequencyInJD - a.frequencyInJD
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            Skill gaps
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-silver">
            Skills the job description asks for, and whether they appear in your resume.
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

      {/* Summary */}
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-silver">Skill coverage</p>
            <p className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', toneText[scoreTone(analysis.skillMatchScore)])}>
              {analysis.skillMatchScore}%
            </p>
            <p className="mt-1 text-sm text-silver">
              {analysis.matchedSkills.length} of {totalSkills} skills from this job description were
              found in your resume.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-mint/25 bg-mint/[0.06] px-4 py-2.5">
              <dt className="text-[11px] text-silver">Found</dt>
              <dd className="font-mono text-xl font-semibold text-mint">{analysis.matchedSkills.length}</dd>
            </div>
            <div className="rounded-lg border border-amber-warn/25 bg-amber-warn/[0.06] px-4 py-2.5">
              <dt className="text-[11px] text-silver">Missing</dt>
              <dd className="font-mono text-xl font-semibold text-amber-warn">{analysis.missingSkills.length}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={cn('h-full rounded-full', toneFill[scoreTone(analysis.skillMatchScore)])}
            style={{ width: `${analysis.skillMatchScore}%` }}
          />
        </div>
      </section>

      {/* Missing skills */}
      <section className="panel p-5 sm:p-6" aria-labelledby="missing-skills-heading">
        <h2 id="missing-skills-heading" className="font-heading text-base font-semibold text-porcelain">
          Skills to address first
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Required skills come first, then the ones mentioned most often in the job description.
        </p>

        {missing.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {missing.map(skill => (
              <li
                key={skill.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-porcelain">{skill.name}</p>
                  <p className="text-[11px] text-silver">
                    {skill.category}
                    {skill.frequencyInJD > 0
                      ? ` · mentioned ${skill.frequencyInJD}× in the job description`
                      : ''}
                  </p>
                </div>
                <span className={cn('tag', importanceClass(skill.importance))}>{skill.importance}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-mint/25 bg-mint/[0.05] p-3 text-sm text-silver">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            No requested skills are missing from your resume.
          </p>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs leading-relaxed text-silver">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          A missing skill is not automatically a problem. If you have used it, name it explicitly in
          your resume. If not, treat it as something to learn — never claim experience you do not
          have.
        </p>
      </section>

      {/* Matched skills */}
      <section className="panel p-5 sm:p-6" aria-labelledby="matched-skills-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="matched-skills-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
            <CheckCircle2 className="h-4 w-4 text-mint" aria-hidden="true" />
            Skills already represented
          </h2>
          <span className="font-mono text-xs text-silver">{analysis.matchedSkills.length} found</span>
        </div>

        {analysis.matchedSkills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {analysis.matchedSkills.map(skill => (
              <li
                key={skill.name}
                title={`${skill.category} · ${skill.importance}`}
                className="rounded-md border border-mint/25 bg-mint/10 px-2.5 py-1 text-xs font-medium text-mint"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-silver">
            None of the job’s listed skills were found. Add the tools and technologies you actually
            use to your skills and experience sections.
          </p>
        )}
      </section>

      {/* Category detail */}
      <Disclosure
        summary="Coverage by skill category"
        hint="See which areas are strong and which need the most work."
        count={analysis.categoryGaps.length}
      >
        <div className="space-y-4">
          {analysis.categoryGaps.map(category => (
            <div key={category.category}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-porcelain">{category.category}</span>
                <span className="font-mono text-xs font-semibold text-silver">
                  {category.matchedCount} / {category.totalRequired}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={cn('h-full rounded-full', toneFill[scoreTone(category.matchPercentage)])}
                  style={{ width: `${category.matchPercentage}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-silver">
                {category.missingSkills.length > 0
                  ? `Not found: ${category.missingSkills.join(', ')}`
                  : 'Nothing missing in this category.'}
              </p>
            </div>
          ))}
        </div>
      </Disclosure>

      {/* Honest guidance */}
      <section className="panel p-5 sm:p-6" aria-labelledby="gap-guidance-heading">
        <h2 id="gap-guidance-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
          <BookOpen className="h-4 w-4 text-ion" aria-hidden="true" />
          How to close a gap honestly
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-silver">
          <li className="flex gap-2.5">
            <span className="font-mono text-xs font-semibold text-mint">01</span>
            <span>
              If you used the skill in coursework, projects, or a previous role, mention it by its
              standard name and describe what you built with it.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono text-xs font-semibold text-ion">02</span>
            <span>
              If you are learning it, add it once you have something concrete to show — a project,
              repo, or certificate.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono text-xs font-semibold text-amber-warn">03</span>
            <span>
              Use the exact terminology from the posting where it is accurate (for example
              “PostgreSQL”, not “Postgres SQL”).
            </span>
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-2 pb-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onTabChange('results')}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          Back to your results
        </Button>
        <Button variant="ghost" size="md" onClick={() => onTabChange('ats-checker')}>
          Review ATS check
        </Button>
      </div>
    </div>
  );
};

export default SkillGapView;
