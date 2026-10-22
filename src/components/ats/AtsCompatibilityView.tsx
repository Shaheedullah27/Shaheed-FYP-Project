import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  FileText, 
  Mail, 
  Phone, 
  Linkedin, 
  Layers, 
  Sparkles,
  XCircle,
  HelpCircle as QuestionIcon,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { AnalysisResult, ActiveTab } from '../../types';
import { ScoreRing } from '../ui/ScoreRing';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

interface AtsCompatibilityViewProps {
  analysis: AnalysisResult | null;
  onGoToAnalyze: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

export const AtsCompatibilityView: React.FC<AtsCompatibilityViewProps> = ({
  analysis,
  onGoToAnalyze,
  onTabChange,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  if (!analysis) {
    return (
      <div className="p-12 panel text-center border border-white/[0.08] bg-[#131720]">
        <div className="w-12 h-12 rounded-2xl bg-[#79F2C0]/10 border border-[#79F2C0]/25 flex items-center justify-center mx-auto mb-4 text-[#79F2C0]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-display font-bold text-ink mb-1">No ATS Audit Available</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6 leading-relaxed">
          Run an analysis on your resume and target job posting to inspect parser extractability, contact metadata, and standard section structures.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="btn-primary text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Analyze a Resume Now
        </button>
      </div>
    );
  }

  const report = analysis.atsCompatibilityReport;

  if (!report) {
    return (
      <div className="p-12 panel text-center border border-white/[0.08] bg-[#131720]">
        <div className="w-12 h-12 rounded-2xl bg-[#62D9F5]/10 border border-[#62D9F5]/25 flex items-center justify-center mx-auto mb-4 text-[#62D9F5]">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-display font-bold text-ink mb-1">No Readability Report Generated</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6 leading-relaxed">
          The parser did not generate a structural readability audit for this record. Re-run analysis in Match Studio.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="btn-primary text-xs"
        >
          Re-run Analysis
        </button>
      </div>
    );
  }

  const filteredChecks = report.checks.filter((c) => {
    if (activeCategoryFilter === 'all') return true;
    return c.category === activeCategoryFilter;
  });

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'High Readability', tone: 'text-[#79F2C0] bg-[#79F2C0]/10 border-[#79F2C0]/30' };
    if (score >= 70) return { label: 'Moderate Readability', tone: 'text-[#62D9F5] bg-[#62D9F5]/10 border-[#62D9F5]/30' };
    if (score >= 50) return { label: 'Needs Improvement', tone: 'text-[#F4BD73] bg-[#F4BD73]/10 border-[#F4BD73]/30' };
    return { label: 'Structural Risk', tone: 'text-[#FF777F] bg-[#FF777F]/10 border-[#FF777F]/30' };
  };

  const scoreBadge = getScoreBadge(report.atsScore);

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#79F2C0] mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>ATS COMPATIBILITY & PARSER AUDIT</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Resume Readability & Layout Verification
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Structural verification of contact coordinates, section headers, text extractability, and ATS parsing readiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('results')}
              className="btn-ghost text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-[#62D9F5]" />
              <span>View Match Results</span>
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Official Disclaimer Banner */}
      <motion.div variants={riseIn}>
        <div className="p-4 rounded-xl bg-[#F4BD73]/8 border border-[#F4BD73]/25 text-xs text-[#F4BD73] flex items-start gap-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#F4BD73]" />
          <div className="leading-relaxed text-[#F1F0EA]/90">
            <strong className="text-[#F4BD73] font-semibold">Parser Verification Disclaimer: </strong>
            This is an automated heuristic readability and text-extraction audit, <em>not an official score from any commercial ATS vendor</em> (such as Workday, Greenhouse, or Taleo). It does not guarantee job interviews or predict human hiring decisions.
          </div>
        </div>
      </motion.div>

      {/* Hero Scorecard & Scoring Breakdown */}
      <motion.div variants={riseIn} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main ATS Compatibility Scorecard */}
        <GlowPanel glow className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-mute">
                Readability Score
              </span>
              <span className={cn('text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border', scoreBadge.tone)}>
                {scoreBadge.label}
              </span>
            </div>

            <div className="py-2 flex justify-center">
              <ScoreRing
                value={report.atsScore}
                label="ATS INDEX"
                sublabel="extractability"
                size={160}
                strokeWidth={10}
              />
            </div>

            <p className="text-xs text-mute leading-relaxed text-center mt-3 mb-4">
              Tests whether text, metadata, standard headings, and layout blocks can be parsed deterministically.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-xs text-mute mb-2">
              <span className="font-mono text-[11px]">Audit breakdown:</span>
              <span className="font-mono text-[11px]">
                <strong className="text-[#79F2C0]">{report.passedChecks} passed</strong> ·{' '}
                <strong className="text-[#F4BD73]">{report.warningChecks} warnings</strong> ·{' '}
                <strong className="text-[#FF777F]">{report.failedChecks} issues</strong>
              </span>
            </div>
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#79F2C0] h-full transition-all duration-500" 
                style={{ width: `${(report.passedChecks / report.totalChecks) * 100}%` }} 
                title={`${report.passedChecks} passed`}
              />
              <div 
                className="bg-[#F4BD73] h-full transition-all duration-500" 
                style={{ width: `${(report.warningChecks / report.totalChecks) * 100}%` }} 
                title={`${report.warningChecks} warnings`}
              />
              <div 
                className="bg-[#FF777F] h-full transition-all duration-500" 
                style={{ width: `${(report.failedChecks / report.totalChecks) * 100}%` }} 
                title={`${report.failedChecks} failed`}
              />
            </div>
          </div>
        </GlowPanel>

        {/* Scoring Breakdown Criteria */}
        <GlowPanel className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
              <h2 className="text-sm font-display font-bold text-ink flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#79F2C0]" />
                Parser Scoring Framework
              </h2>
              <span className="text-[11px] text-mute font-mono">100-Point Algorithmic Heuristic</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-ink">1. Contact Identity</span>
                  <span className="font-mono font-bold text-[#79F2C0]">{report.scoringBreakdown.contactScore} / 20 pts</span>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  Email coordinate (10 pts), phone pattern (7 pts), and valid LinkedIn / portfolio URI (3 pts).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-ink">2. Standard Sections</span>
                  <span className="font-mono font-bold text-[#62D9F5]">{report.scoringBreakdown.sectionsScore} / 30 pts</span>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  Identifies Experience, Skills, Education, and Projects. Academic projects compensate for student profiles.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-ink">3. Typography & Extractability</span>
                  <span className="font-mono font-bold text-[#A99BFF]">{report.scoringBreakdown.formattingScore} / 25 pts</span>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  Scans for untyped glyphs, multi-column reading flow anomalies, and non-extractable text zones.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-ink">4. Keyword Density</span>
                  <span className="font-mono font-bold text-[#F4BD73]">{report.scoringBreakdown.keywordScore} / 25 pts</span>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  Presence and contextual placement of core technical requirements extracted from the target spec.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-mute">
            <span>Distinct from Semantic Match Index ({analysis.cosineSimilarity}% TF-IDF).</span>
            <button
              onClick={() => onTabChange('results')}
              className="text-[#62D9F5] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View comparison matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Verification Level Legend Banner */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-ink">
            <Layers className="w-4 h-4 text-[#79F2C0]" />
            <span>Verification Certainty Tiers</span>
          </div>
          <p className="text-xs text-mute mb-3">
            To prevent deceptive guarantees, each audit item is classified by what can be mathematically verified from extracted text:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[#79F2C0]/25 bg-[#79F2C0]/5">
              <span className="font-mono font-bold text-[#79F2C0] block mb-1">● VERIFIED</span>
              <p className="text-[11px] text-mute leading-relaxed">
                Direct regex match or deterministic structural extract, such as RFC-compliant email or phone.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#F4BD73]/25 bg-[#F4BD73]/5">
              <span className="font-mono font-bold text-[#F4BD73] block mb-1">▲ APPROXIMATE</span>
              <p className="text-[11px] text-mute leading-relaxed">
                Heuristic estimate based on token proximity, section order, or standard heading variations.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <span className="font-mono font-bold text-mute block mb-1">■ UNVERIFIED (TEXT-ONLY)</span>
              <p className="text-[11px] text-mute leading-relaxed">
                Visual elements like multi-column layout fidelity or image-rasterized text cannot be proven via raw stream.
              </p>
            </div>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Contact Details & Sections Grid */}
      <motion.div variants={riseIn} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Audit Card */}
        <GlowPanel className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-sm font-display font-bold text-ink flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#79F2C0]" />
              <span>Contact Coordinates</span>
            </h2>
            <span className="text-[11px] font-mono text-mute">Parsed from Stream</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Email */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-mute shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-ink block">Email Address</span>
                  <span className="text-[11px] font-mono text-mute truncate block">
                    {report.contactDetails.emailFound ? report.contactDetails.emailAddress : 'No email detected'}
                  </span>
                </div>
              </div>
              {report.contactDetails.emailFound ? (
                <span className="text-[#79F2C0] bg-[#79F2C0]/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#79F2C0]/30 shrink-0">
                  Detected
                </span>
              ) : (
                <span className="text-[#FF777F] bg-[#FF777F]/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#FF777F]/30 shrink-0">
                  Missing
                </span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-mute shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-ink block">Phone Number</span>
                  <span className="text-[11px] font-mono text-mute truncate block">
                    {report.contactDetails.phoneFound ? report.contactDetails.phoneNumber : 'No phone number detected'}
                  </span>
                </div>
              </div>
              {report.contactDetails.phoneFound ? (
                <span className="text-[#79F2C0] bg-[#79F2C0]/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#79F2C0]/30 shrink-0">
                  Detected
                </span>
              ) : (
                <span className="text-[#FF777F] bg-[#FF777F]/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#FF777F]/30 shrink-0">
                  Missing
                </span>
              )}
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-mute shrink-0">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-ink block">LinkedIn Profile</span>
                  <span className="text-[11px] font-mono text-mute truncate block">
                    {report.contactDetails.linkedinFound ? (report.contactDetails.linkedinUrl || 'LinkedIn detected') : 'No profile URL detected'}
                  </span>
                </div>
              </div>
              {report.contactDetails.linkedinFound ? (
                <span className="text-[#79F2C0] bg-[#79F2C0]/10 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#79F2C0]/30 shrink-0">
                  Detected
                </span>
              ) : (
                <span className="text-mute bg-white/[0.04] px-2.5 py-0.5 rounded-full text-[11px] font-mono shrink-0">
                  Optional
                </span>
              )}
            </div>
          </div>
        </GlowPanel>

        {/* Standard Sections Audit Card (With Student Protection) */}
        <GlowPanel className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-sm font-display font-bold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#62D9F5]" />
              <span>Standard Structural Sections</span>
            </h2>
            <span className="text-[11px] font-mono text-[#A99BFF]">Academic Guardrails Active</span>
          </div>

          <div className="space-y-2 text-xs">
            {report.sectionsDetected.map((sec, idx) => {
              const isPresent = sec.status === 'present';
              const isAlternative = sec.status === 'alternative_present';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div>
                    <span className="font-semibold text-ink">{sec.sectionName}</span>
                    {isAlternative && (
                      <span className="text-[10px] text-[#A99BFF] block mt-0.5">
                        Academic projects substituted for professional tenure
                      </span>
                    )}
                  </div>

                  {isPresent ? (
                    <span className="flex items-center gap-1.5 text-[#79F2C0] text-[11px] font-mono font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Found</span>
                    </span>
                  ) : isAlternative ? (
                    <span className="flex items-center gap-1.5 text-[#A99BFF] text-[11px] font-mono font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Projects Active</span>
                    </span>
                  ) : sec.isOptionalForStudents ? (
                    <span className="text-mute text-[11px] font-mono">Optional</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[#F4BD73] text-[11px] font-mono font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Missing</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Comprehensive Checklist Table */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-sm font-display font-bold text-ink">
                Parser Inspection Checklist
              </h2>
              <p className="text-xs text-mute mt-0.5">
                Full list of text extractability, contact heuristics, and section detections.
              </p>
            </div>

            {/* Filter categories */}
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs overflow-x-auto min-w-0 max-w-full">
              {[
                { id: 'all', label: 'All Checks' },
                { id: 'text_extraction', label: 'Extraction' },
                { id: 'contact_info', label: 'Contact' },
                { id: 'sections', label: 'Sections' },
                { id: 'formatting_risk', label: 'Formatting' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveCategoryFilter(f.id)}
                  className={cn(
                    'px-3 py-1 rounded-lg font-mono text-[11px] transition-colors whitespace-nowrap',
                    activeCategoryFilter === f.id
                      ? 'bg-[#79F2C0] text-[#0B0D12] font-bold shadow-[0_0_12px_rgba(121,242,192,0.3)]'
                      : 'text-mute hover:text-ink'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {filteredChecks.map((chk) => {
              const isPass = chk.status === 'pass';
              const isWarning = chk.status === 'warning';
              const isFail = chk.status === 'fail';
              const isUnverified = chk.status === 'unverified';

              return (
                <div key={chk.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isPass && <CheckCircle2 className="w-4 h-4 text-[#79F2C0]" />}
                      {isWarning && <AlertTriangle className="w-4 h-4 text-[#F4BD73]" />}
                      {isFail && <XCircle className="w-4 h-4 text-[#FF777F]" />}
                      {isUnverified && <QuestionIcon className="w-4 h-4 text-mute" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-ink">{chk.title}</span>
                        <span className={cn(
                          'text-[10px] font-mono px-2 py-0.2 rounded border',
                          chk.verificationLevel === 'verified'
                            ? 'bg-[#79F2C0]/10 text-[#79F2C0] border-[#79F2C0]/30'
                            : chk.verificationLevel === 'approximate'
                            ? 'bg-[#F4BD73]/10 text-[#F4BD73] border-[#F4BD73]/30'
                            : 'bg-white/[0.04] text-mute border-white/[0.08]'
                        )}>
                          {chk.verificationLevel === 'verified' ? 'VERIFIED' : chk.verificationLevel === 'approximate' ? 'ESTIMATE' : 'UNVERIFIED'}
                        </span>
                      </div>

                      <p className="text-xs text-mute leading-relaxed mb-1">
                        {chk.message}
                      </p>

                      {chk.details && (
                        <span className="text-[11px] text-mute/80 font-mono block mt-1">
                          {chk.details}
                        </span>
                      )}

                      {chk.recommendation && (
                        <div className="mt-2 text-[11px] text-[#62D9F5] bg-[#62D9F5]/8 p-2.5 rounded-lg border border-[#62D9F5]/20">
                          <strong className="text-[#62D9F5] font-semibold">Action: </strong>
                          {chk.recommendation}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={cn(
                    'text-[10px] font-mono font-bold px-2.5 py-1 rounded-full self-start shrink-0 border',
                    isPass ? 'bg-[#79F2C0]/10 text-[#79F2C0] border-[#79F2C0]/30' :
                    isWarning ? 'bg-[#F4BD73]/10 text-[#F4BD73] border-[#F4BD73]/30' :
                    isFail ? 'bg-[#FF777F]/10 text-[#FF777F] border-[#FF777F]/30' :
                    'bg-white/[0.04] text-mute border-white/[0.08]'
                  )}>
                    {chk.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </motion.div>

      {/* Prioritized Actionable Recommendations */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-6">
          <h2 className="text-sm font-display font-bold text-ink mb-1">
            Formatting & Layout Refinements
          </h2>
          <p className="text-xs text-mute mb-4">
            Prioritized structural tweaks to maximize compatibility across enterprise ATS parsers.
          </p>

          <div className="space-y-3">
            {report.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-xl border text-xs transition-colors',
                  rec.priority === 'high' 
                    ? 'bg-[#FF777F]/5 border-[#FF777F]/30' 
                    : rec.priority === 'medium'
                    ? 'bg-[#F4BD73]/5 border-[#F4BD73]/30'
                    : 'bg-white/[0.02] border-white/[0.08]'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-ink">{rec.issue}</span>
                  <span className={cn(
                    'text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border',
                    rec.priority === 'high' ? 'bg-[#FF777F]/15 text-[#FF777F] border-[#FF777F]/30' :
                    rec.priority === 'medium' ? 'bg-[#F4BD73]/15 text-[#F4BD73] border-[#F4BD73]/30' :
                    'bg-white/[0.06] text-mute border-white/[0.1]'
                  )}>
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="text-[#F1F0EA]/90 font-medium mb-1.5 leading-relaxed">
                  <strong className="text-[#79F2C0] font-semibold">Recommended Fix: </strong>
                  {rec.fix}
                </p>
                <p className="text-[11px] text-mute leading-relaxed">
                  <span className="font-semibold text-mute">Rationale: </span>
                  {rec.reason}
                </p>
              </div>
            ))}

            {report.recommendations.length === 0 && (
              <div className="p-8 text-center text-xs text-[#79F2C0] bg-[#79F2C0]/5 rounded-xl border border-[#79F2C0]/25">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-[#79F2C0]" />
                <span className="font-medium">No layout or readability issues detected. Your resume structure parses cleanly.</span>
              </div>
            )}
          </div>
        </GlowPanel>
      </motion.div>
    </motion.div>
  );
};
