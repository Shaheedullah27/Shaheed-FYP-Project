import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Copy,
  TrendingUp,
  FileText,
  Info,
  Check,
  HelpCircle,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { AnalysisResult, ActiveTab } from '../../types';
import {
  downloadHtmlReport,
  downloadMarkdownReport
} from '../../services/reportGenerator';
import { GlowPanel } from '../ui/GlowPanel';
import { ScoreRing } from '../ui/ScoreRing';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { cn, riseIn, stagger, scoreTone, toneText, toneFill } from '../../lib/ui';

interface ResultsViewProps {
  analysis: AnalysisResult;
  onTabChange: (tab: ActiveTab) => void;
  onNewAnalysis: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  analysis,
  onTabChange,
  onNewAnalysis,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState<'all' | 'skills' | 'keywords'>('all');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const filteredTermWeights = analysis.topTermWeights.filter(t => {
    if (selectedTermFilter === 'skills') return t.isSkill;
    if (selectedTermFilter === 'keywords') return !t.isSkill;
    return true;
  });

  const overallTone = scoreTone(analysis.overallScore);
  const skillTone = scoreTone(analysis.skillMatchScore);

  const copyReportSummary = () => {
    const text = `AI ResumeMatch Analysis Report
--------------------------------------
Resume: ${analysis.resumeTitle}
Target Role: ${analysis.jobTitle}
Overall score: ${analysis.overallScore}%
Text match: ${analysis.cosineSimilarity}%
Skill match: ${analysis.skillMatchScore}%
ATS readability: ${analysis.atsReadabilityScore}%

Matched Skills (${analysis.matchedSkills.length}):
${analysis.matchedSkills.map(s => `• ${s.name} (${s.category})`).join('\n')}

Missing Skills (${analysis.missingSkills.length}):
${analysis.missingSkills.map(s => `• ${s.name} [${s.importance}] (${s.category})`).join('\n')}

Suggestions:
${analysis.recommendations.map(r => `• ${r.title}\n  Try this: ${r.suggestedAction}`).join('\n')}

Note: These scores show how the resume compares with the job posting. They do not predict whether you will get hired.
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `ai-resumematch-${analysis.id}.json`);
    dlAnchorElem.click();
  };

  const kpis = [
    {
      key: 'skills',
      label: 'Skill Match Rate',
      value: analysis.skillMatchScore,
      tone: skillTone,
      badge: `${analysis.matchedSkills.length}/${analysis.matchedSkills.length + analysis.missingSkills.length} skills`,
      desc: `Found ${analysis.matchedSkills.length} job skills in the resume; ${analysis.missingSkills.length} were not found.`,
    },
    {
      key: 'keywords',
      label: 'Keyword Density',
      value: analysis.keywordDensityScore,
      tone: scoreTone(analysis.keywordDensityScore),
      badge: `${analysis.topTermWeights.length} top terms`,
      desc: 'How strongly the resume’s most important terms align with the vocabulary of the job posting.',
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-7"
    >
      {/* Top Bar Banner with Actions */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-mute mb-1.5 font-mono">
              <span>{analysis.timestamp}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans">Resume and job comparison</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-ink truncate">
              {analysis.resumeTitle} <span className="text-[#7DEFFF]">↔</span> {analysis.jobTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => downloadHtmlReport(analysis)}
              className="btn-primary px-3.5 py-2 text-xs"
              title="Download a report or print it as a PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download report</span>
            </button>
            <button
              onClick={() => downloadMarkdownReport(analysis)}
              className="btn-ghost px-3 py-2 text-xs"
              title="Download a text report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text report</span>
            </button>
            <button onClick={copyReportSummary} className="btn-ghost px-3 py-2 text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy summary'}</span>
            </button>
            <button onClick={downloadReportJson} className="btn-ghost px-3 py-2 text-xs">
              <span>JSON</span>
            </button>
            <button onClick={onNewAnalysis} className="btn-ghost px-3.5 py-2 text-xs">
              <span>New comparison</span>
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Mandatory Objective Disclaimer Notice */}
      <motion.div
        variants={riseIn}
        role="note"
        className="p-4 bg-[#35E7FF]/6 border border-[#35E7FF]/25 rounded-xl text-xs text-[#C8F4FF] flex items-start gap-3"
      >
        <Info className="w-4 h-4 text-[#7DEFFF] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-ink">About these scores: </span>
          They show how closely the wording and skills in your resume match the job posting. They do
          not predict whether you will get hired, and they are not an employer’s official ATS score.
        </div>
      </motion.div>

      {/* ============================================================
          Scorecard: composite + circular similarity + ATS indicator
          ============================================================ */}
      <motion.section
        variants={riseIn}
        aria-label="Score summary"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* Composite match */}
        <GlowPanel glow className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                Composite Match
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                  overallTone === 'good'
                    ? 'tag-ok'
                    : overallTone === 'ion'
                    ? 'tag-ion'
                    : overallTone === 'warn'
                    ? 'tag-warn'
                    : 'tag-bad'
                )}
              >
                {analysis.overallScore >= 75 ? 'Strong match' : analysis.overallScore >= 55 ? 'Partial match' : 'Room to improve'}
              </span>
            </div>
            <div className={cn('text-5xl font-extrabold font-mono tabular-nums mb-2', toneText[overallTone])}>
              <AnimatedNumber value={analysis.overallScore} suffix="%" />
            </div>
            <p className="text-xs text-mute leading-relaxed">
              Combines the text match, matching skills, keywords, and how easy the resume is to read.
            </p>
          </div>
          <div className="mt-5">
            <div className="w-full bg-white/8 h-2.5 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', toneFill[overallTone])}
                initial={{ width: 0 }}
                animate={{ width: `${analysis.overallScore}%` }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                style={{ boxShadow: '0 0 14px rgba(53,231,255,0.5)' }}
              />
            </div>
            <div className="flex items-center justify-between mt-2.5 text-[11px] text-mute">
              <span>Weighted: text × 0.40 · skills × 0.35 · keywords × 0.15 · ATS × 0.10</span>
              <button
                onClick={() => setShowFormulaModal(!showFormulaModal)}
                className="flex items-center gap-1 text-[#7DEFFF] hover:text-[#35E7FF] font-semibold transition-colors"
                aria-expanded={showFormulaModal}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Formula</span>
              </button>
            </div>
          </div>
        </GlowPanel>

        {/* Circular resume ↔ job similarity */}
        <GlowPanel glow className="p-6 flex items-center justify-center">
          <ScoreRing
            value={analysis.cosineSimilarity}
            label="Resume ↔ job text similarity"
            sublabel="Cosine similarity of TF-IDF word weights — how much the two documents' wording overlaps. Not a hiring probability."
            size={186}
          />
        </GlowPanel>

        {/* Separate ATS readability indicator */}
        <GlowPanel
          glow
          className="p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#35E7FF]/40"
        >
          <button
            onClick={() => onTabChange('ats-checker')}
            className="flex flex-col items-center group"
            aria-label="Open the full ATS readability audit"
          >
            <ScoreRing
              value={analysis.atsReadabilityScore}
              label="ATS readability"
              size={186}
              tone="ion"
            />
            <span className="mt-3 text-[11px] text-mute text-center max-w-[16rem] leading-relaxed">
              Checks whether contact details and common resume sections are easy to find. An internal
              readability check — not an official vendor ATS score.
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7DEFFF] group-hover:text-[#35E7FF] transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              Open full ATS audit
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </GlowPanel>
      </motion.section>

      {/* Formula Explanation Accordion */}
      {showFormulaModal && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <GlowPanel className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <BookOpen className="w-4 h-4 text-[#7DEFFF]" />
              <span>How the scores are calculated</span>
            </div>
            <div className="text-xs text-mute space-y-2 leading-relaxed">
              <p>
                <strong className="text-ink">1. Word frequency:</strong> Words that appear more often count more, but repeating them many times adds less and less. Formula: tf(t, d) = 1 + ln(frequency).
              </p>
              <p>
                <strong className="text-ink">2. Word importance:</strong> Uncommon words get more weight than words used everywhere. Formula: idf(t) = ln((1 + N)/(1 + df)) + 1.
              </p>
              <p>
                <strong className="text-ink">3. Text match:</strong> The app compares the word patterns in both documents. A higher score means more overlap. Formula: cos(θ) = (u · v) / (||u||₂ × ||v||₂).
              </p>
              <p>
                <strong className="text-ink">4. Overall score:</strong>{' '}
                <code className="font-mono text-[#7DEFFF] bg-white/5 px-1.5 py-0.5 rounded">
                  Text match × 0.40 + Skills × 0.35 + Keywords × 0.15 + ATS readability × 0.10
                </code>
                .
              </p>
            </div>
          </GlowPanel>
        </motion.div>
      )}

      {/* KPI metric cards (skills rate + supporting metrics) */}
      <motion.section
        variants={riseIn}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {kpis.map((kpi) => (
          <GlowPanel key={kpi.key} glow className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
                {kpi.label}
              </span>
              <span className="tag tag-mute font-mono">{kpi.badge}</span>
            </div>
            <div className={cn('text-4xl font-extrabold font-mono tabular-nums mb-2', toneText[kpi.tone])}>
              <AnimatedNumber value={kpi.value} suffix="%" />
            </div>
            <p className="text-xs text-mute leading-relaxed">{kpi.desc}</p>
            <div className="w-full bg-white/8 h-2.5 rounded-full overflow-hidden mt-4">
              <motion.div
                className={cn('h-full rounded-full', toneFill[kpi.tone])}
                initial={{ width: 0 }}
                animate={{ width: `${kpi.value}%` }}
                transition={{ duration: 1.1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </GlowPanel>
        ))}
      </motion.section>

      {/* Category Breakdown Progress Bars */}
      <motion.section variants={riseIn}>
        <GlowPanel glow className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-ink">Skill matches by category</h2>
              <p className="text-xs text-mute mt-0.5">See which skills from the job posting were found in your resume.</p>
            </div>
            <button
              onClick={() => onTabChange('skills')}
              className="text-xs font-semibold text-[#7DEFFF] hover:text-[#35E7FF] transition-colors flex items-center gap-1"
            >
              <span>See all skill gaps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.categoryGaps.map((cat) => (
              <div
                key={cat.category}
                className="p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-ink">{cat.category}</span>
                  <span className="text-xs font-mono font-bold text-ink">{cat.matchPercentage}%</span>
                </div>
                <div className="w-full bg-white/8 h-2 rounded-full overflow-hidden mb-2.5">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      cat.matchPercentage >= 75
                        ? 'bg-emerald-400'
                        : cat.matchPercentage >= 50
                        ? 'bg-[#35E7FF]'
                        : 'bg-amber-400'
                    )}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${cat.matchPercentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] text-mute">
                  <span className="truncate">Matched: {cat.matchedSkills.join(', ') || 'None'}</span>
                  {cat.missingSkills.length > 0 && (
                    <span className="text-rose-300 font-medium shrink-0">
                      Missing: {cat.missingSkills.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlowPanel>
      </motion.section>

      {/* TF-IDF Top Term Weights Comparison Chart */}
      <motion.section variants={riseIn}>
        <GlowPanel glow className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-ink">Important words in each document</h2>
              <p className="text-xs text-mute mt-0.5">
                Shows which words and phrases had the most weight in the resume and job posting.
              </p>
            </div>

            <div className="seg self-start sm:self-auto" role="group" aria-label="Filter terms">
              {(['all', 'skills', 'keywords'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedTermFilter(filter)}
                  data-active={selectedTermFilter === filter}
                  className="seg-btn capitalize"
                >
                  {filter === 'all' ? 'All words' : filter}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredTermWeights.slice(0, 10)}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <XAxis
                  dataKey="term"
                  tick={{ fontSize: 11, fill: '#98A6BE' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  axisLine={{ stroke: 'rgba(244,247,255,0.12)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#98A6BE' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(244,247,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: '#0C1220',
                    borderColor: 'rgba(53,231,255,0.35)',
                    borderRadius: '10px',
                    color: '#F4F7FF',
                    fontSize: '12px',
                    boxShadow: '0 16px 40px -18px rgba(0,0,0,0.9)',
                  }}
                  labelStyle={{ color: '#7DEFFF', fontWeight: 700 }}
                  itemStyle={{ color: '#F4F7FF' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#98A6BE' }} />
                <Bar dataKey="resumeWeight" name="Resume" fill="#35E7FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobWeight" name="Job posting" fill="#8B5CFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlowPanel>
      </motion.section>

      {/* Actionable Recommendations Section */}
      <motion.section variants={riseIn}>
        <GlowPanel glow className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-ink">Suggestions to improve your resume</h2>
              <p className="text-xs text-mute mt-0.5">
                Based on this comparison. Only add skills or experience that are true for you.
              </p>
            </div>
            <button
              onClick={() => onTabChange('skills')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#7DEFFF] hover:text-[#35E7FF] transition-colors"
            >
              <span>View all skills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {analysis.recommendations.map((rec) => {
              const isCritical = rec.type === 'critical';
              const isStrength = rec.type === 'strength';

              return (
                <div
                  key={rec.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all hover:-translate-y-0.5',
                    isCritical
                      ? 'bg-rose-500/6 border-rose-400/25 hover:border-rose-400/50'
                      : isStrength
                      ? 'bg-emerald-500/6 border-emerald-400/25 hover:border-emerald-400/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-[#35E7FF]/35'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      {isCritical ? (
                        <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                      ) : isStrength ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-[#7DEFFF] shrink-0" />
                      )}
                      <h3 className="text-xs font-bold text-ink">{rec.title}</h3>
                    </div>

                    <span className="tag tag-mute font-mono shrink-0">
                      Section: {rec.targetSection}
                    </span>
                  </div>

                  <p className="text-xs text-mute mb-2.5 leading-relaxed">{rec.description}</p>

                  <div className="text-xs text-ink bg-white/[0.05] p-3 rounded-lg border border-white/10 flex items-start gap-2">
                    <span className="text-[#7DEFFF] font-bold shrink-0">Try this:</span>
                    <span className="text-mute">{rec.suggestedAction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </motion.section>

      {/* Matched vs Missing Skills Quick Summary Strip */}
      <motion.section variants={riseIn} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Matched Skills */}
        <GlowPanel glow className="p-5">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <h3 className="text-xs font-bold text-ink">Skills found ({analysis.matchedSkills.length})</h3>
            </div>
            <span className="text-[11px] text-mute">Also listed in your resume</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {analysis.matchedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs font-medium text-emerald-200 bg-emerald-400/10 border border-emerald-400/25 rounded-md px-2.5 py-1 hover:border-emerald-400/60 transition-colors"
              >
                {skill.name}
              </span>
            ))}
            {analysis.matchedSkills.length === 0 && (
              <p className="text-xs text-mute italic">No matching skills were found.</p>
            )}
          </div>
        </GlowPanel>

        {/* Missing Skills */}
        <GlowPanel glow className="p-5">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300" />
              <h3 className="text-xs font-bold text-ink">Skills not found ({analysis.missingSkills.length})</h3>
            </div>
            <span className="text-[11px] text-mute">Listed in the job posting</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {analysis.missingSkills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs font-medium text-rose-200 bg-rose-400/10 border border-rose-400/25 rounded-md px-2.5 py-1 hover:border-rose-400/60 transition-colors"
              >
                {skill.name}
              </span>
            ))}
            {analysis.missingSkills.length === 0 && (
              <p className="text-xs text-mute italic">All listed job skills were found.</p>
            )}
          </div>
        </GlowPanel>
      </motion.section>
    </motion.div>
  );
};
