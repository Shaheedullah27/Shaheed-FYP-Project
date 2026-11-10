import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  ArrowRight,
  Upload,
  Briefcase,
  LineChart,
  Sparkles,
  Gauge,
  CheckCircle2,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { prefersReducedMotion } from '../../lib/ui';

/** 3D hero is split out so the WebGL bundle loads lazily and only on desktop. */
const HeroStage = lazy(() => import('../three/HeroStage'));

interface OverviewViewProps {
  onStartAnalysis: () => void;
}

const STEPS = [
  {
    icon: Upload,
    title: 'Upload your resume',
    description: 'Choose a PDF or DOCX. The backend extracts the readable text.',
  },
  {
    icon: Briefcase,
    title: 'Add the job description',
    description: 'Paste the posting for the role you want to compare against.',
  },
  {
    icon: LineChart,
    title: 'Review your results',
    description: 'See the text match, keyword coverage, missing terms and suggestions.',
  },
];

const OUTPUTS = [
  {
    icon: Gauge,
    title: 'Match percentage',
    description: 'TF-IDF cosine similarity between your resume and the job description.',
  },
  {
    icon: CheckCircle2,
    title: 'Matched keywords',
    description: 'Skills and terms that appear in both documents.',
  },
  {
    icon: ShieldCheck,
    title: 'Keyword coverage',
    description: 'A basic ATS-style check of dictionary keywords, with matched and missing lists.',
  },
  {
    icon: ListChecks,
    title: 'Improvement suggestions',
    description: 'Rule-based next steps derived from the actual analysis, never invented experience.',
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({ onStartAnalysis }) => {
  // Never download the WebGL bundle on small screens — the scene is decoration.
  const [showHero, setShowHero] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setShowHero(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Load the 3D chunk after the page is idle, and skip it for reduced motion.
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Welcome + single primary action */}
      <section className="panel emerald-veil overflow-hidden">
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.35fr_1fr]">
          <div className="p-6 sm:p-8">
            <span className="tag tag-mint">NLP resume and job matching</span>
            <h2 className="mt-3 font-heading text-[22px] font-semibold tracking-tight text-porcelain sm:text-[26px]">
              How well does your resume match the job?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-silver">
              Upload your resume, paste a job description, and get an explainable comparison:
              TF-IDF text similarity, matched and missing keywords, basic keyword coverage, and
              practical suggestions.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={onStartAnalysis}
                leftIcon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Analyze My Resume
              </Button>
            </div>

            <p className="mt-4 text-xs text-silver">
              No sign-in, no saved history. Your documents are sent to the local Flask API for this
              analysis only.
            </p>
          </div>

          <div
            className="relative hidden min-h-[220px] overflow-hidden border-l border-white/[0.06] lg:block"
            aria-hidden="true"
          >
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
                  <p className="text-xs font-semibold text-silver">Step {index + 1}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-porcelain">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-silver">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* What the result contains */}
      <section aria-labelledby="outputs-heading" className="space-y-3">
        <div className="px-1">
          <h2 id="outputs-heading" className="text-sm font-semibold text-porcelain">
            What you will see
          </h2>
          <p className="mt-0.5 text-xs text-silver">
            Every value is calculated from the uploaded resume and the job description you paste.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OUTPUTS.map(output => {
            const Icon = output.icon;
            return (
              <article key={output.title} className="panel flex gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-ion">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-porcelain">{output.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-silver">{output.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-silver">
        The match percentage measures text similarity. Keyword coverage measures how many
        dictionary keywords from the job description appear in the resume. Neither is a hiring
        prediction or an official ATS score.
      </p>
    </div>
  );
};

export default OverviewView;
