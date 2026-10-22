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
  BarChart3,
  Layers,
  FileText,
  Lock,
  Search,
  ExternalLink,
  ChevronRight,
  Terminal,
  Clock,
  Sparkle,
} from 'lucide-react';
import { ActiveTab, AnalysisResult, HistoryItem } from '../../types';
import { GlowPanel } from '../ui/GlowPanel';
import { TiltCard } from '../ui/TiltCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ScoreRing } from '../ui/ScoreRing';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/Separator';
import { riseIn, stagger, viewportOnce } from '../../lib/ui';

/** 3D hero is split out so the WebGL bundle loads lazily on demand. */
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
    tag: 'Web Development',
    title: 'Alex Chen ↔ Acme SaaS Inc.',
    desc: 'Full-stack software engineer resume compared against a modern cloud web development specification.',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
  },
  {
    resumeId: 'resume-data-ml',
    jdId: 'jd-data-ml',
    tag: 'Data Science & ML',
    title: 'Priya Sharma ↔ Cognitive Insights',
    desc: 'Machine learning scientist resume evaluated against a high-dimensional AI model pipeline role.',
    skills: ['PyTorch', 'Scikit-Learn', 'SQL', 'Python'],
  },
  {
    resumeId: 'resume-devops',
    jdId: 'jd-devops',
    tag: 'Cloud & Infrastructure',
    title: 'Marcus Vance ↔ Nexlify Cloud',
    desc: 'Site reliability and platform engineer evaluated against Kubernetes, Terraform, and AWS requirements.',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD'],
  },
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  onTabChange,
  onSelectSampleAndAnalyze,
  history,
  activeAnalysis,
  onViewAnalysis,
}) => {
  // Real statistics derived from actual saved comparisons
  const totalCount = history.length;
  const avgCosine =
    totalCount > 0
      ? Math.round(history.reduce((acc, h) => acc + h.cosineSimilarity, 0) / totalCount)
      : null;
  const avgOverall =
    totalCount > 0
      ? Math.round(history.reduce((acc, h) => acc + h.overallScore, 0) / totalCount)
      : null;
  const topMissing = totalCount > 0 ? history[0].topMissingSkill : null;

  const metrics = [
    {
      label: 'Comparisons saved',
      value: totalCount,
      suffix: '',
      display: String(totalCount),
      hint: totalCount > 0 ? 'Recorded in local session storage' : 'No comparisons yet',
      icon: FileCheck2,
      accent: 'text-[#62D9F5]',
      iconBg: 'bg-[#62D9F5]/10 border-[#62D9F5]/25',
    },
    {
      label: 'Average text match',
      value: avgCosine,
      suffix: '%',
      display: avgCosine !== null ? `${avgCosine}%` : '—',
      hint: avgCosine !== null ? 'Sublinear TF-IDF lexical overlap' : 'Computed upon first run',
      icon: TrendingUp,
      accent: 'text-[#79F2C0]',
      iconBg: 'bg-[#79F2C0]/10 border-[#79F2C0]/25',
    },
    {
      label: 'Average overall score',
      value: avgOverall,
      suffix: '%',
      display: avgOverall !== null ? `${avgOverall}%` : '—',
      hint: avgOverall !== null ? 'Combined cosine, skills & readability' : 'Computed upon first run',
      icon: BarChart3,
      accent: 'text-[#A99BFF]',
      iconBg: 'bg-[#A99BFF]/10 border-[#A99BFF]/25',
    },
    {
      label: 'Top missing skill',
      value: null,
      suffix: '',
      display: topMissing ?? '—',
      hint: topMissing ? 'Highest priority keyword gap' : 'Identified from run history',
      icon: Target,
      accent: 'text-[#F4BD73]',
      iconBg: 'bg-[#F4BD73]/10 border-[#F4BD73]/25',
      isText: true,
    },
  ];

  return (
    <div className="space-y-12 md:space-y-16 pb-12">
      {/* ============================================================
          SECTION 1: HERO (Your Resume. Decoded. + 3D Holographic Engine)
          ============================================================ */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={stagger}
        className="relative overflow-hidden rounded-2xl edge-light shadow-lift bg-[#131720]/80 border border-white/[0.08]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 100% at 80% 20%, rgba(121,242,192,0.06), transparent 60%), radial-gradient(60% 80% at 20% 80%, rgba(98,217,245,0.04), transparent 55%), linear-gradient(165deg, #131720, #0B0D12)',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-40" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          {/* Copy Column */}
          <div className="p-5 sm:p-8 md:p-12 flex flex-col justify-center">
            {/* Live Status Badge */}
            <motion.div
              variants={riseIn}
              className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full border border-[#79F2C0]/30 bg-[#79F2C0]/10 text-[10px] sm:text-[11px] font-mono tracking-wide text-[#79F2C0] mb-5 sm:mb-6 max-w-full truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#79F2C0] animate-ping shrink-0" />
              <span className="truncate">DETERMINISTIC NLP ENGINE · PRIVATE & IN-BROWSER</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={riseIn}
              className="text-2xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight leading-[1.1] text-porcelain mb-4"
            >
              Your Resume.{' '}
              <span className="text-mint-grad block sm:inline">Decoded.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={riseIn}
              className="text-sm sm:text-base text-silver leading-relaxed max-w-xl mb-8 font-sans"
            >
              Compare any resume against a job description with sublinear TF-IDF and cosine
              similarity. Uncover skill gaps, detect ATS formatting risks, and evaluate alignment
              — entirely computed on your device or your private local backend.
            </motion.p>

            {/* Action CTA Buttons */}
            <motion.div variants={riseIn} className="flex flex-wrap items-center gap-3.5 mb-8">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onTabChange('analyze')}
                leftIcon={<Sparkles className="w-4 h-4" strokeWidth={2.4} />}
                className="shadow-[0_4px_20px_-4px_rgba(121,242,192,0.45)] cursor-pointer"
              >
                Analyze My Resume
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => onTabChange('backend-guide')}
                leftIcon={<Cpu className="w-4 h-4 text-[#A99BFF]" />}
                className="cursor-pointer"
              >
                Explore How It Works
              </Button>
            </motion.div>

            {/* Architectural Tags */}
            <motion.ul variants={riseIn} className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
              {[
                { icon: TrendingUp, label: 'Sublinear TF-IDF' },
                { icon: Target, label: 'Hierarchical Skill Taxonomy' },
                { icon: ShieldCheck, label: 'ATS Readability Heuristics' },
                { icon: Lock, label: 'Zero Third-Party Model Leaks' },
              ].map((f) => (
                <li
                  key={f.label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-silver bg-white/[0.04] border border-white/[0.08]"
                >
                  <f.icon className="w-3.5 h-3.5 text-[#62D9F5]" />
                  <span>{f.label}</span>
                </li>
              ))}
            </motion.ul>
          </div>

          {/* 3D Holographic Instrument Stage */}
          <motion.div
            variants={riseIn}
            className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-[440px] flex items-center justify-center overflow-hidden"
          >
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="skeleton h-44 w-44 rounded-full" />
                </div>
              }
            >
              <HeroStage />
            </Suspense>
            {/* Soft vertical gradient fade at base */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#131720] to-transparent"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================
          SECTION 2: REAL ANALYSIS METRICS & LIVE BENCHMARKS
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        aria-label="Real analysis metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((m) => (
          <motion.div key={m.label} variants={riseIn}>
            <GlowPanel glow className="p-5 h-full bg-[#1B2230] border border-white/[0.08] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-silver">
                  {m.label}
                </span>
                <span className={`p-2 rounded-lg border ${m.iconBg}`}>
                  <m.icon className={`w-4 h-4 ${m.accent}`} />
                </span>
              </div>
              <div className={`text-2xl font-heading font-extrabold font-mono tabular-nums mb-1 ${m.accent}`}>
                {m.value !== null && !('isText' in m && m.isText) ? (
                  <AnimatedNumber value={m.value} suffix={m.suffix} />
                ) : (
                  <span className={m.isText ? 'text-lg text-porcelain truncate block' : 'text-porcelain'}>
                    {m.display}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-silver/80 leading-relaxed">{m.hint}</div>
            </GlowPanel>
          </motion.div>
        ))}
      </motion.section>

      {/* ============================================================
          SECTION 3: ARCHITECTURAL FEATURES (Not generic cards)
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#79F2C0] mb-1">
              Core Capabilities
            </div>
            <h2 className="text-2xl font-heading font-bold text-porcelain">
              Built for Precision, Not Vague Approximations
            </h2>
          </div>
          <p className="text-xs text-silver max-w-md leading-relaxed">
            Every metric corresponds directly to verified mathematical formulations and deterministic
            pattern parsing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <motion.div variants={riseIn} className="p-6 rounded-xl bg-[#1B2230] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#79F2C0]/10 border border-[#79F2C0]/25 text-[#79F2C0] flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold text-porcelain mb-2">
                Sublinear TF-IDF Similarity
              </h3>
              <p className="text-xs text-silver leading-relaxed">
                Applies logarithmic damping (1 + ln(tf)) to term frequencies. Keyword-stuffing does
                not distort scores; rare, domain-specific terminology carries proportionate mathematical
                weight.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-2 font-mono text-[11px] text-silver">
              <span className="text-[#79F2C0]">Formula:</span>
              <span>cos(θ) = (A · B) / (||A|| ||B||)</span>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={riseIn} className="p-6 rounded-xl bg-[#1B2230] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#62D9F5]/10 border border-[#62D9F5]/25 text-[#62D9F5] flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold text-porcelain mb-2">
                Hierarchical Skill Taxonomy
              </h3>
              <p className="text-xs text-silver leading-relaxed">
                Evaluates resumes across 7 distinct technical categories using boundary-aware regex.
                Distinguishes between programming frameworks, databases, cloud DevOps, and
                leadership skills.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-2 font-mono text-[11px] text-silver">
              <span className="text-[#62D9F5]">Taxonomy:</span>
              <span>250+ Verified Curated Terms</span>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={riseIn} className="p-6 rounded-xl bg-[#1B2230] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#A99BFF]/10 border border-[#A99BFF]/25 text-[#A99BFF] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold text-porcelain mb-2">
                Deterministic ATS Diagnostics
              </h3>
              <p className="text-xs text-silver leading-relaxed">
                Audits document structure against applicant tracking parser standards: detects standard
                headings, contact coordinates, multi-column reading order risks, and non-standard tables.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-2 font-mono text-[11px] text-silver">
              <span className="text-[#A99BFF]">Readability:</span>
              <span>Standard Heading Detection</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ============================================================
          SECTION 4: WORKFLOW EXPLANATION (3-Step Pipeline)
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        className="p-7 sm:p-10 rounded-2xl bg-[#131720] border border-white/[0.08] relative overflow-hidden"
      >
        <div className="max-w-2xl mb-8">
          <div className="text-xs font-mono uppercase tracking-widest text-[#62D9F5] mb-1">
            Analysis Pipeline
          </div>
          <h2 className="text-2xl font-heading font-bold text-porcelain mb-2">
            How the Decoded Comparison Operates
          </h2>
          <p className="text-xs text-silver leading-relaxed">
            From raw input files to mathematical vector alignment, your data passes through three
            transparent stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="relative p-5 rounded-xl bg-[#1B2230]/70 border border-white/[0.08]">
            <div className="text-xs font-mono font-bold text-[#79F2C0] mb-2">01 / INGESTION</div>
            <h4 className="text-sm font-heading font-bold text-porcelain mb-2">
              Text Extraction & Normalization
            </h4>
            <p className="text-xs text-silver leading-relaxed">
              Extracts raw text from PDF, DOCX, or direct pastes. Filters noise, strips formatting
              characters, and produces normalized token streams on your device.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative p-5 rounded-xl bg-[#1B2230]/70 border border-white/[0.08]">
            <div className="text-xs font-mono font-bold text-[#62D9F5] mb-2">02 / VECTORIZATION</div>
            <h4 className="text-sm font-heading font-bold text-porcelain mb-2">
              Sublinear TF-IDF Weighting
            </h4>
            <p className="text-xs text-silver leading-relaxed">
              Weights terms based on inverse document frequencies and computes cosine similarity in
              vector space alongside strict boundary-matched skill taxonomy lookups.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative p-5 rounded-xl bg-[#1B2230]/70 border border-white/[0.08]">
            <div className="text-xs font-mono font-bold text-[#A99BFF] mb-2">03 / REPORTING</div>
            <h4 className="text-sm font-heading font-bold text-porcelain mb-2">
              Actionable Decoded Output
            </h4>
            <p className="text-xs text-silver leading-relaxed">
              Synthesizes match percentage, skill gap breakdown, ATS structural feedback, and
              targeted recommendations for interview readiness.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ============================================================
          SECTION 5: ILLUSTRATIVE RESULTS SHOWCASE
          ============================================================ */}
      {activeAnalysis && (
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger}
          className="p-7 sm:p-9 rounded-2xl bg-[#1B2230] border border-white/[0.08]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#79F2C0] mb-1">
                Active Benchmark Preview
              </div>
              <h2 className="text-xl font-heading font-bold text-porcelain">
                {activeAnalysis.resumeTitle} ↔ {activeAnalysis.jobTitle}
              </h2>
            </div>
            <Button
              variant="outline-mint"
              size="sm"
              onClick={() => onTabChange('results')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="cursor-pointer"
            >
              Open Full Results View
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Score Ring */}
            <div className="flex justify-center p-4 bg-[#131720] rounded-xl border border-white/[0.08]">
              <ScoreRing
                value={activeAnalysis.overallScore}
                label="Overall Alignment Score"
                sublabel="Combines cosine text similarity, skill frequency, and ATS checks."
                size={170}
              />
            </div>

            {/* Quick Metrics */}
            <div className="space-y-3">
              <div className="p-3.5 bg-[#131720] rounded-xl border border-white/[0.08]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-silver">Vocabulary Overlap</span>
                  <span className="text-xs font-mono font-bold text-[#62D9F5]">
                    {activeAnalysis.cosineSimilarity}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#62D9F5]"
                    style={{ width: `${activeAnalysis.cosineSimilarity}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#131720] rounded-xl border border-white/[0.08]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-silver">Skills Matched</span>
                  <span className="text-xs font-mono font-bold text-[#79F2C0]">
                    {activeAnalysis.matchedSkills.length} / {activeAnalysis.matchedSkills.length + activeAnalysis.missingSkills.length}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#79F2C0]"
                    style={{
                      width: `${
                        activeAnalysis.matchedSkills.length + activeAnalysis.missingSkills.length > 0
                          ? Math.round(
                              (activeAnalysis.matchedSkills.length /
                                (activeAnalysis.matchedSkills.length + activeAnalysis.missingSkills.length)) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#131720] rounded-xl border border-white/[0.08]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-silver">ATS Readability</span>
                  <span className="text-xs font-mono font-bold text-[#A99BFF]">
                    {activeAnalysis.atsReadabilityScore ?? 85}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#A99BFF]"
                    style={{ width: `${activeAnalysis.atsReadabilityScore ?? 85}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top Skills Preview */}
            <div className="p-4 bg-[#131720] rounded-xl border border-white/[0.08] flex flex-col justify-between h-full">
              <div>
                <span className="text-[11px] font-mono text-silver uppercase tracking-wider block mb-2.5">
                  Highlighted Matches
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAnalysis.matchedSkills.slice(0, 6).map((skill) => (
                    <Badge key={skill.name} variant="mint" size="sm">
                      {skill.name}
                    </Badge>
                  ))}
                  {activeAnalysis.missingSkills.slice(0, 3).map((skill) => (
                    <Badge key={skill.name} variant="amber" size="sm">
                      Missing: {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-silver">
                Detailed breakdowns available in Skill Gaps and ATS Check tabs.
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ============================================================
          SECTION 6: INTERACTIVE SAMPLE PLAYGROUND
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={stagger}
        className="space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#62D9F5] mb-1">
              Sample Benchmarks
            </div>
            <h2 className="text-xl font-heading font-bold text-porcelain">
              Try a Curated Sample Comparison
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTabChange('analyze')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="cursor-pointer"
          >
            Use your own resume
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLES.map((s) => (
            <motion.div key={s.resumeId} variants={riseIn}>
              <TiltCard maxTilt={4}>
                <div className="p-5 h-full flex flex-col justify-between rounded-xl bg-[#1B2230] border border-white/[0.08] hover:border-white/[0.18] transition-all">
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-[#62D9F5] mb-2 tracking-wide uppercase">
                      {s.tag}
                    </div>
                    <h3 className="text-sm font-heading font-bold text-porcelain mb-1.5">{s.title}</h3>
                    <p className="text-xs text-silver leading-relaxed mb-4">{s.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {s.skills.map((sk) => (
                        <span key={sk} className="meta-code text-[10px]">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelectSampleAndAnalyze(s.resumeId, s.jdId)}
                    className="w-full justify-center hover:bg-[#79F2C0]/10 hover:border-[#79F2C0]/35 hover:text-[#79F2C0] cursor-pointer"
                  >
                    Run Sample Analysis
                  </Button>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ============================================================
          SECTION 7: FINAL CALL TO ACTION
          ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={riseIn}
        className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#1B2230] to-[#131720] border border-white/[0.1] text-center relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(121,242,192,0.08), transparent 60%)',
          }}
        />
        <div className="relative max-w-xl mx-auto space-y-4">
          <Badge variant="mint" size="sm" dot>
            READY FOR YOUR RESUME
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-porcelain tracking-tight">
            See Exactly What Needs Fine-Tuning
          </h2>
          <p className="text-xs sm:text-sm text-silver leading-relaxed">
            Upload your resume or paste the text alongside any job posting to receive your
            comprehensive alignment breakdown in seconds.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onTabChange('analyze')}
              leftIcon={<Sparkles className="w-4 h-4" strokeWidth={2.4} />}
              className="cursor-pointer"
            >
              Analyze My Resume
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onTabChange('dictionary')}
              leftIcon={<BookOpen className="w-4 h-4 text-silver" />}
              className="cursor-pointer"
            >
              Browse Skills Dictionary
            </Button>
          </div>
        </div>
      </motion.section>

      {/* ============================================================
          SECTION 8: EDITORIAL LANDING PAGE FOOTER
          ============================================================ */}
      <footer className="pt-8 border-t border-white/[0.08] text-silver text-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#79F2C0]" />
              <span className="font-heading font-bold text-porcelain text-sm">AI ResumeMatch</span>
            </div>
            <p className="text-[11px] leading-relaxed text-silver/80">
              An art-directed, private, explainable resume and job description intelligence system.
            </p>
          </div>

          {/* Quick Navigation 1 */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-porcelain font-semibold">
              Workspaces
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button
                  onClick={() => onTabChange('analyze')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Resume Analyzer
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('results')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Comparison Results
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('skills')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Skill Gap Matrix
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('ats-checker')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  ATS Compatibility Audit
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Navigation 2 */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-porcelain font-semibold">
              Architecture
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button
                  onClick={() => onTabChange('backend-guide')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  NLP Engine Architecture
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('dictionary')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Taxonomy Skills Dictionary
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('security')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Security & Quarantine Forensics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onTabChange('history')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  Past Analysis Records
                </button>
              </li>
            </ul>
          </div>

          {/* About & Technical Info */}
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-porcelain font-semibold">
              Project
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button
                  onClick={() => onTabChange('about')}
                  className="hover:text-[#79F2C0] transition-colors cursor-pointer"
                >
                  About This Project
                </button>
              </li>
              <li className="text-silver/60">Final-Year Research Project</li>
              <li className="text-silver/60">Zero Data Retention Guarantee</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-silver/60 font-mono">
          <div>AI ResumeMatch · Deterministic TF-IDF & Cosine Similarity</div>
          <div>Obsidian & Mint Architectural UI</div>
        </div>
      </footer>
    </div>
  );
};

export default OverviewView;
