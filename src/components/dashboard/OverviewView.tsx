import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  ArrowRight,
  Upload,
  Briefcase,
  LineChart,
  FileText,
  Sparkles,
  History,
  Plus,
} from 'lucide-react';
import { ActiveTab, HistoryItem } from '../../types';
import { Button } from '../ui/Button';
import { prefersReducedMotion, scoreTone, toneText } from '../../lib/ui';

/** 3D hero is split out so the WebGL bundle loads lazily and only on desktop. */
const HeroStage = lazy(() => import('../three/HeroStage'));

interface OverviewViewProps {
  onTabChange: (tab: ActiveTab) => void;
  onSelectSampleAndAnalyze: (resumeId: string, jdId: string) => void;
  history: HistoryItem[];
  onViewAnalysis: (analysisId: string) => void;
}

const STEPS = [
  {
    icon: Upload,
    title: 'Upload your resume',
    description: 'Add a PDF, Word document, or paste the text.',
  },
  {
    icon: Briefcase,
    title: 'Add the job description',
    description: 'Paste the posting for the role you want.',
  },
  {
    icon: LineChart,
    title: 'Review your results',
    description: 'See what matches, what is missing, and what to fix.',
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  onTabChange,
  onSelectSampleAndAnalyze,
  history,
  onViewAnalysis,
}) => {
  // Never download the WebGL bundle on small screens — the 3D scene is
  // decoration only, so mobile gets the plain surface instead.
  const [showHero, setShowHero] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setShowHero(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Load the 3D chunk only after the page is idle, and skip it entirely when
  // the user asked for reduced motion.
  useEffect(() => {
    if (!showHero || prefersReducedMotion()) return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = window as IdleWindow;

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => setHeroReady(true), { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => setHeroReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [showHero]);

  const recent = history.slice(0, 3);
  const total = history.length;
  const averageScore =
    total > 0 ? Math.round(history.reduce((sum, item) => sum + item.overallScore, 0) / total) : null;
  const bestScore = total > 0 ? Math.max(...history.map(item => item.overallScore)) : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Welcome + single primary action */}
      <section className="panel emerald-veil overflow-hidden">
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.35fr_1fr]">
          <div className="p-6 sm:p-8">
            <h2 className="font-heading text-[22px] font-semibold tracking-tight text-porcelain sm:text-[26px]">
              Ready to improve your resume?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-silver">
              Compare your resume with a job description to see how well they match, which skills
              are missing, and what to change next.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onTabChange('analyze')}
                leftIcon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Analyze My Resume
              </Button>
              <button
                type="button"
                onClick={() => onSelectSampleAndAnalyze('resume-fullstack', 'jd-fullstack')}
                className="text-sm font-medium text-silver underline-offset-4 transition-colors hover:text-porcelain hover:underline"
              >
                Or try an example comparison
              </button>
            </div>

            <p className="mt-4 text-xs text-silver">
              Takes about a minute. Your files stay in this browser.
            </p>
          </div>

          <div className="relative hidden min-h-[220px] overflow-hidden border-l border-white/[0.06] lg:block" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 80% at 60% 40%, rgba(101,221,181,0.09), transparent 65%)',
              }}
            />
            {showHero && heroReady && (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-32 w-32 rounded-full bg-mint/5" />
                  </div>
                }
              >
                <HeroStage />
              </Suspense>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-graphite via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Three-step workflow */}
      <section aria-labelledby="how-it-works-heading" className="space-y-3">
        <h2 id="how-it-works-heading" className="px-1 text-sm font-semibold text-porcelain">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="panel flex gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mint/25 bg-mint/10 text-mint">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-silver">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-porcelain">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-silver">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Recent analyses */}
      <section aria-labelledby="recent-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 id="recent-heading" className="text-sm font-semibold text-porcelain">
              Recent analyses
            </h2>
            {total > 0 && averageScore !== null && bestScore !== null && (
              <p className="mt-0.5 text-xs text-silver">
                {total} saved {total === 1 ? 'analysis' : 'analyses'} · average match{' '}
                {averageScore}% · best {bestScore}%
              </p>
            )}
          </div>
          {total > 0 && (
            <button
              type="button"
              onClick={() => onTabChange('history')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ion transition-colors hover:text-mint"
            >
              View all history
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-mint/25 bg-mint/10 text-mint">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-base font-semibold text-porcelain">No analyses yet</h3>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-silver">
              Your comparisons will appear here with the job title, date, and match score. Start
              with your first resume.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-5"
              onClick={() => onTabChange('analyze')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Analyze My Resume
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08] bg-graphite">
            {recent.map(item => {
              const tone = scoreTone(item.overallScore);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-porcelain">{item.jobTitle}</p>
                    <p className="mt-0.5 truncate text-xs text-silver">
                      {item.resumeTitle}
                      {item.companyName ? ` · ${item.companyName}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-silver">{item.timestamp}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className={`font-mono text-lg font-semibold tabular-nums ${toneText[tone]}`}>
                        {item.overallScore}%
                      </span>
                      <span className="block text-xs text-silver">
                        match
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewAnalysis(item.id)}
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      View results
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <p className="flex items-center gap-1.5 px-1 text-xs text-silver">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Showing comparisons saved in this browser only.
        </p>
      )}
    </div>
  );
};

export default OverviewView;
