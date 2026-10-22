import React, { lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import {
  Target,
  FileCheck2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { ActiveTab, AnalysisResult, HistoryItem } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { TiltCard } from '../ui/TiltCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { riseIn, stagger, viewportOnce } from '../../lib/ui';

/** 3D hero is split out so the WebGL bundle only loads on demand. */
const HeroStage = lazy(() => import('../three/HeroStage'));

interface OverviewViewProps {
  onTabChange: (tab: ActiveTab) => void;
  onSelectSampleAndAnalyze: (resumeId: string, jdId: string) => void;
  history: HistoryItem[];
  activeAnalysis: AnalysisResult | null;
  onViewAnalysis: (analysisId: string) => void;
}

const SAMPLES = [
  {
    resumeId: 'resume-fullstack',
    jdId: 'jd-fullstack',
    tag: 'Sample 1 · Web development',
    title: 'Alex Chen ↔ Acme SaaS Inc.',
    desc: "A web developer's resume compared with a job asking for React, Node.js, PostgreSQL, and Docker.",
  },
  {
    resumeId: 'resume-data-ml',
    jdId: 'jd-data-ml',
    tag: 'Sample 2 · Data science',
    title: 'Priya Sharma ↔ Cognitive Insights',
    desc: "A data scientist's resume compared with a job asking for Scikit-learn, PyTorch, and SQL.",
  },
  {
    resumeId: 'resume-devops',
    jdId: 'jd-devops',
    tag: 'Sample 3 · Cloud computing',
    title: 'Marcus Vance ↔ Nexlify Cloud',
    desc: 'A cloud engineer\'s resume compared with a job asking for AWS, Kubernetes, Terraform, and Python.',
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  onTabChange,
  onSelectSampleAndAnalyze,
  history,
  activeAnalysis,
  onViewAnalysis,
}) => {
  // Real statistics only — derived from actual saved comparisons.
  const totalCount = history.length;
  const avgCosine = totalCount > 0
    ? Math.round(history.reduce((acc, h) => acc + h.cosineSimilarity, 0) / totalCount)
    : null;
  const avgOverall = totalCount > 0
    ? Math.round(history.reduce((acc, h) => acc + h.overallScore, 0) / totalCount)
    : null;
  const topMissing = totalCount > 0 ? history[0].topMissingSkill : null;

  const metrics = [
    {
      label: 'Comparisons saved',
      value: totalCount,
      suffix: '',
      display: String(totalCount),
      hint: totalCount > 0 ? 'Saved in your history' : 'No comparisons yet',
      icon: FileCheck2,
      accent: 'text-[#7DEFFF]',
      iconBg: 'bg-[#35E7FF]/10 border-[#35E7FF]/25',
    },
    {
      label: 'Average text match',
      value: avgCosine,
      suffix: '%',
      display: avgCosine !== null ? `${avgCosine}%` : '—',
      hint: avgCosine !== null ? 'How much the wording overlaps' : 'Runs your first comparison to see this',
      icon: TrendingUp,
      accent: 'text-emerald-300',
      iconBg: 'bg-emerald-400/10 border-emerald-400/25',
    },
    {
      label: 'Average overall score',
      value: avgOverall,
      suffix: '%',
      display: avgOverall !== null ? `${avgOverall}%` : '—',
      hint: avgOverall !== null ? 'Combines text, skills, and readability' : 'Runs your first comparison to see this',
      icon: BarChart3,
      accent: 'text-[#C4B5FD]',
      iconBg: 'bg-[#8B5CFF]/12 border-[#8B5CFF]/30',
    },
    {
      label: 'Top missing skill',
      value: null,
      suffix: '',
      display: topMissing ?? '—',
      hint: topMissing ? 'Most common missing skill in recent runs' : 'Appears after your first comparison',
      icon: Target,
      accent: 'text-amber-300',
      iconBg: 'bg-amber-400/10 border-amber-400/25',
      isText: true,
    },
  ];

  return (
    <div className="space-y-7">
      {/* ============================================================
          Hero: product introduction + holographic 3D engine
          ============================================================ */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={stagger}
        className="relative overflow-hidden rounded-2xl edge-light shadow-lift"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 120% at 85% 20%, rgba(139,92,255,0.18), transparent 60%), radial-gradient(70% 100% at 15% 85%, rgba(53,231,255,0.12), transparent 55%), linear-gradient(165deg, #0C1220, #070B14)',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-50" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 items-stretch">
          {/* Copy column */}
          <div className="p-7 md:p-10 flex flex-col justify-center">
            <motion.div
              variants={riseIn}
              className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full border border-[#35E7FF]/30 bg-[#35E7FF]/8 text-[11px] font-semibold text-[#7DEFFF] mb-5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI intelligence lab · runs on your device</span>
            </motion.div>

            <motion.h1
              variants={riseIn}
              className="text-2xl sm:text-3xl lg:text-[2.35rem] font-extrabold tracking-tight leading-[1.12] text-grad mb-3"
            >
              See how your resume matches a job
            </motion.h1>

            <motion.p
              variants={riseIn}
              className="text-sm text-mute leading-relaxed max-w-xl mb-6"
            >
              Compare a resume with a job posting. See matching skills, missing skills, and how easy
              the resume may be for hiring software to read. Your resume stays on your device unless
              you choose to use the local Python backend.
            </motion.p>

            <motion.div variants={riseIn} className="flex flex-wrap items-center gap-3 mb-6">
              <button onClick={() => onTabChange('analyze')} className="btn-primary px-5 py-2.5 text-xs">
                <Sparkles className="w-4 h-4" strokeWidth={2.4} />
                <span>Compare a resume</span>
              </button>
              <button onClick={() => onTabChange('backend-guide')} className="btn-ghost px-4 py-2.5 text-xs">
                <Cpu className="w-4 h-4 text-[#C4B5FD]" />
                <span>How the app works</span>
              </button>
            </motion.div>

            <motion.ul variants={riseIn} className="flex flex-wrap gap-2">
              {[
                { icon: TrendingUp, label: 'TF-IDF text match' },
                { icon: Target, label: 'Skill gap analysis' },
                { icon: ShieldCheck, label: 'ATS readability check' },
                { icon: BookOpen, label: 'Exportable reports' },
              ].map((f) => (
                <li
                  key={f.label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-mute bg-white/[0.05] border border-white/10"
                >
                  <f.icon className="w-3.5 h-3.5 text-[#7DEFFF]" />
                  {f.label}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* 3D holographic engine — lazy, non-interactive overlay */}
          <motion.div
            variants={riseIn}
            className="relative min-h-[240px] sm:min-h-[300px] lg:min-h-[380px]"
          >
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="skeleton h-40 w-40 rounded-full" />
                </div>
              }
            >
              <HeroStage />
            </Suspense>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070B14] to-transparent"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================
          Real analysis statistics
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        aria-label="Analysis statistics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((m) => (
          <motion.div key={m.label} variants={riseIn}>
            <GlowPanel glow className="p-5 h-full">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-mute">
                  {m.label}
                </span>
                <span className={`p-2 rounded-lg border ${m.iconBg}`}>
                  <m.icon className={`w-4 h-4 ${m.accent}`} />
                </span>
              </div>
              <div className={`text-2xl font-extrabold font-mono tabular-nums mb-1 ${m.accent}`}>
                {m.value !== null && !('isText' in m && m.isText) ? (
                  <AnimatedNumber value={m.value} suffix={m.suffix} />
                ) : (
                  <span className={m.isText ? 'text-xl text-ink truncate block' : 'text-ink'}>
                    {m.display}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-mute leading-relaxed">{m.hint}</div>
            </GlowPanel>
          </motion.div>
        ))}
      </motion.section>

      {/* ============================================================
          Sample comparisons
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
      >
        <GlowPanel className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-ink">Try a sample comparison</h2>
              <p className="text-xs text-mute mt-0.5">
                Choose a sample resume and job posting to see how the comparison works.
              </p>
            </div>
            <button
              onClick={() => onTabChange('analyze')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#7DEFFF] hover:text-[#35E7FF] transition-colors shrink-0"
            >
              <span>Use your own resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLES.map((s) => (
              <motion.div key={s.resumeId} variants={riseIn}>
                <TiltCard maxTilt={5}>
                  <GlowPanel
                    glow
                    className="p-4.5 h-full flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-[#7DEFFF] mb-1.5 tracking-wide">
                        {s.tag}
                      </div>
                      <h3 className="text-sm font-bold text-ink mb-1.5">{s.title}</h3>
                      <p className="text-xs text-mute leading-relaxed mb-4">{s.desc}</p>
                    </div>
                    <button
                      onClick={() => onSelectSampleAndAnalyze(s.resumeId, s.jdId)}
                      className="w-full py-2 px-3 text-xs font-semibold text-ink bg-white/[0.06] hover:bg-[#35E7FF]/12 hover:border-[#35E7FF]/40 border border-white/10 rounded-lg transition-all"
                    >
                      Try this sample
                    </button>
                  </GlowPanel>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </GlowPanel>
      </motion.section>

      {/* ============================================================
          Recent comparisons + methodology
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* Recent Analyses List */}
        <motion.div variants={riseIn} className="lg:col-span-2">
          <GlowPanel glow className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-ink">Recent comparisons</h2>
                <p className="text-xs text-mute mt-0.5">Open a saved result to see the details.</p>
              </div>
              <button
                onClick={() => onTabChange('history')}
                className="text-xs font-semibold text-[#7DEFFF] hover:text-[#35E7FF] transition-colors"
              >
                View all
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-9 h-9 text-mute/60 mx-auto mb-3" />
                <p className="text-xs font-semibold text-ink mb-1">Nothing saved yet</p>
                <p className="text-xs text-mute mb-5 max-w-sm mx-auto leading-relaxed">
                  Your comparisons will appear here once you run your first analysis.
                </p>
                <button onClick={() => onTabChange('analyze')} className="btn-primary px-4 py-2 text-xs">
                  Start a comparison
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {history.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onViewAnalysis(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViewAnalysis(item.id);
                      }
                    }}
                    className="group py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.04] -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-ink truncate">{item.resumeTitle}</div>
                      <div className="flex items-center gap-2 text-[11px] text-mute mt-0.5">
                        <span className="truncate">{item.jobTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{item.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono tabular-nums text-ink">
                          {item.overallScore}%
                        </div>
                        <div className="text-[11px] text-mute">
                          {item.matchedSkillCount} skills matched
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-mute group-hover:text-[#35E7FF] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlowPanel>
        </motion.div>

        {/* Explainable Methodology Card */}
        <motion.div variants={riseIn}>
          <GlowPanel glow className="p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[#7DEFFF]">
                <BookOpen className="w-4 h-4" />
                <span>How the score works</span>
              </div>
              <h3 className="text-sm font-bold text-ink mb-2">How does the app compare text?</h3>
              <p className="text-xs text-mute leading-relaxed mb-4">
                TF-IDF is a method that gives more weight to useful words and skills. The app
                compares those words in your resume and the job posting. It uses a fixed
                calculation, not a chatbot.
              </p>
              <div className="space-y-2.5 text-xs text-mute border-t border-white/10 pt-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-[#7DEFFF] font-bold">1.</span>
                  <span>Repeating a word many times does not greatly raise its score.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-[#7DEFFF] font-bold">2.</span>
                  <span>The text score measures how much wording the two documents share.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-[#7DEFFF] font-bold">3.</span>
                  <span>Skills are grouped so you can spot what is missing.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-4">
              <button
                onClick={() => onTabChange('backend-guide')}
                className="btn-ghost w-full py-2 text-xs"
              >
                See how the app works
              </button>
            </div>
          </GlowPanel>
        </motion.div>
      </motion.section>
    </div>
  );
};
