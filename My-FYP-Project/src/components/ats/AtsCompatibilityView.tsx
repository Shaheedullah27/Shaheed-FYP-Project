import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  Info, 
  FileText, 
  Mail, 
  Phone, 
  Linkedin, 
  MapPin, 
  Layers, 
  ArrowRight, 
  Sparkles,
  ExternalLink,
  Check,
  XCircle,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { AnalysisResult, ActiveTab } from '../../types';

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
  const [showScoringDetails, setShowScoringDetails] = useState(false);

  if (!analysis) {
    return (
      <div className="p-12 panel text-center ">
        <ShieldCheck className="w-10 h-10 text-[#7DEFFF] mx-auto mb-3" />
        <h2 className="text-base font-bold text-ink mb-1">No ATS check yet</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6">
          Compare your resume with a job posting to check whether hiring software can read important details.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="px-4 py-2 text-xs font-semibold btn-primary text-ink rounded-lg transition-colors"
        >
          Compare a resume
        </button>
      </div>
    );
  }

  const report = analysis.atsCompatibilityReport;

  // Fallback if report hasn't been generated
  if (!report) {
    return (
      <div className="p-12 panel text-center ">
        <ShieldCheck className="w-10 h-10 text-[#7DEFFF] mx-auto mb-3" />
        <h2 className="text-base font-bold text-ink mb-1">No readability results yet</h2>
        <p className="text-xs text-mute max-w-md mx-auto mb-6">
          Compare the resume again to see its readability results.
        </p>
        <button
          onClick={onGoToAnalyze}
          className="px-4 py-2 text-xs font-semibold btn-primary text-ink rounded-lg transition-colors"
        >
          Compare again
        </button>
      </div>
    );
  }

  const filteredChecks = report.checks.filter((c) => {
    if (activeCategoryFilter === 'all') return true;
    return c.category === activeCategoryFilter;
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-300';
    if (score >= 70) return 'text-[#7DEFFF]';
    if (score >= 50) return 'text-amber-300';
    return 'text-rose-300';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Easy to read', bg: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' };
    if (score >= 70) return { label: 'Mostly easy to read', bg: 'bg-[#35E7FF]/10 text-[#7DEFFF] border-[#35E7FF]/25' };
    if (score >= 50) return { label: 'Some details may be hard to read', bg: 'bg-amber-400/10 text-amber-700 border-amber-200' };
    return { label: 'May be hard to read', bg: 'bg-rose-400/10 text-rose-300 border-rose-400/30' };
  };

  const scoreBadge = getScoreBadge(report.atsScore);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 panel">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#7DEFFF] font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Applicant tracking system (ATS) check</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Can hiring software read your resume?
          </h1>
          <p className="text-xs text-mute mt-0.5">
            Checks whether contact details, common headings, and text can be found in your resume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('results')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink/75 bg-white/8 hover:bg-white/12 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View comparison results</span>
          </button>
        </div>
      </div>

      {/* Official Disclaimer Banner */}
      <div className="p-4 bg-amber-400/10/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Please note: </span>
          This is a basic readability check, not a score from an employer’s hiring system. It is separate from the resume-to-job text match.
        </div>
      </div>

      {/* Hero Scorecard & Scoring Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main ATS Compatibility Scorecard */}
        <div className="p-6 panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                Resume readability score
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${scoreBadge.bg}`}>
                {scoreBadge.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-5xl font-extrabold font-mono tabular-nums ${getScoreColor(report.atsScore)}`}>
                {report.atsScore}
              </span>
              <span className="text-mute/80 text-sm font-semibold">/ 100</span>
            </div>

            <p className="text-xs text-mute leading-relaxed mb-4">
              Checks whether text, contact details, common headings, and simple formatting can be read.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-mute mb-1.5">
              <span>Check summary:</span>
              <span className="font-mono text-[11px]">
                <strong className="text-emerald-300">{report.passedChecks} passed</strong> ·{' '}
                <strong className="text-amber-300">{report.warningChecks} need a look</strong> ·{' '}
                <strong className="text-mute">{report.unverifiedChecks} not checked</strong>
              </span>
            </div>
            <div className="w-full bg-white/8 h-2.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-400/100 h-full transition-all duration-500" 
                style={{ width: `${(report.passedChecks / report.totalChecks) * 100}%` }} 
              />
              <div 
                className="bg-amber-400 h-full transition-all duration-500" 
                style={{ width: `${(report.warningChecks / report.totalChecks) * 100}%` }} 
              />
              <div 
                className="bg-rose-400/100 h-full transition-all duration-500" 
                style={{ width: `${(report.failedChecks / report.totalChecks) * 100}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Scoring Breakdown Criteria */}
        <div className="lg:col-span-2 p-6 panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink">
                How this score is worked out
              </h2>
              <span className="text-[11px] text-mute/80 font-mono">Out of 100 points</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/[0.03] rounded-lg border border-white/8">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink/85">1. Contact Information</span>
                  <span className="font-mono font-bold text-[#7DEFFF]">{report.scoringBreakdown.contactScore} / 20 pts</span>
                </div>
                <p className="text-[11px] text-mute">
                  Email (10 pts), Phone number (7 pts), LinkedIn / portfolio URL (3 pts).
                </p>
              </div>

              <div className="p-3 bg-white/[0.03] rounded-lg border border-white/8">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink/85">2. Resume sections</span>
                  <span className="font-mono font-bold text-[#7DEFFF]">{report.scoringBreakdown.sectionsScore} / 30 pts</span>
                </div>
                <p className="text-[11px] text-mute">
                  Looks for headings such as Skills, Experience, Education, and Projects. Projects and education can count for students without work history.
                </p>
              </div>

              <div className="p-3 bg-white/[0.03] rounded-lg border border-white/8">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink/85">3. Text and layout</span>
                  <span className="font-mono font-bold text-[#7DEFFF]">{report.scoringBreakdown.formattingScore} / 25 pts</span>
                </div>
                <p className="text-[11px] text-mute">
                  Checks for missing text, unusual reading order, and decorative symbols.
                </p>
              </div>

              <div className="p-3 bg-white/[0.03] rounded-lg border border-white/8">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink/85">4. Job skills</span>
                  <span className="font-mono font-bold text-[#7DEFFF]">{report.scoringBreakdown.keywordScore} / 25 pts</span>
                </div>
                <p className="text-[11px] text-mute">
                  Checks whether skills mentioned in the job posting appear in the resume.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between text-[11px] text-mute">
            <span>This score is separate from the text match ({analysis.cosineSimilarity}%).</span>
            <button
              onClick={() => onTabChange('results')}
              className="text-[#7DEFFF] font-semibold hover:underline"
            >
              Compare text scores
            </button>
          </div>
        </div>
      </div>

      {/* Verification Level Legend Banner (Critical per instructions) */}
      <div className="p-4 panel">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-ink">
          <Layers className="w-4 h-4 text-[#7DEFFF]" />
          <span>What these checks can tell</span>
        </div>
        <p className="text-xs text-mute mb-3">
          Some checks are reliable, some are estimates, and some cannot be done from text alone:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10/50">
            <span className="font-bold text-emerald-200 block mb-0.5">● Checked</span>
            <p className="text-[11px] text-emerald-300">
              The app found this directly in the text, such as an email address or phone number.
            </p>
          </div>
          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-400/10/50">
            <span className="font-bold text-amber-800 block mb-0.5">▲ Estimate</span>
            <p className="text-[11px] text-amber-700">
              The app made a best guess, for example about reading order or section names.
            </p>
          </div>
          <div className="p-2.5 rounded-lg border border-white/10 bg-white/10">
            <span className="font-bold text-ink/85 block mb-0.5">■ Not checked</span>
            <p className="text-[11px] text-mute">
              Text inside images and the exact page layout cannot be checked from extracted text alone.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Details & Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Audit Card */}
        <div className="p-5 panel">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/8">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#7DEFFF]" />
              <span>Contact details found</span>
            </h2>
            <span className="text-[11px] text-mute/80">Found in the text</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Email */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/8">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-4 h-4 text-mute/80 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-ink/85 block">Email Address</span>
                  <span className="text-[11px] text-mute truncate block">
                    {report.contactDetails.emailFound ? report.contactDetails.emailAddress : 'No email found'}
                  </span>
                </div>
              </div>
              {report.contactDetails.emailFound ? (
                <span className="text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-400/30">
                  Found
                </span>
              ) : (
                <span className="text-rose-300 bg-rose-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-400/30">
                  Missing
                </span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/8">
              <div className="flex items-center gap-2.5 min-w-0">
                <Phone className="w-4 h-4 text-mute/80 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-ink/85 block">Phone Number</span>
                  <span className="text-[11px] text-mute truncate block">
                    {report.contactDetails.phoneFound ? report.contactDetails.phoneNumber : 'No phone number found'}
                  </span>
                </div>
              </div>
              {report.contactDetails.phoneFound ? (
                <span className="text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-400/30">
                  Found
                </span>
              ) : (
                <span className="text-rose-300 bg-rose-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-400/30">
                  Missing
                </span>
              )}
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/8">
              <div className="flex items-center gap-2.5 min-w-0">
                <Linkedin className="w-4 h-4 text-mute/80 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-ink/85 block">LinkedIn Profile</span>
                  <span className="text-[11px] text-mute truncate block">
                    {report.contactDetails.linkedinFound ? (report.contactDetails.linkedinUrl || 'LinkedIn profile found') : 'No profile link found'}
                  </span>
                </div>
              </div>
              {report.contactDetails.linkedinFound ? (
                <span className="text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-400/30">
                  Found
                </span>
              ) : (
                <span className="text-mute bg-white/8 px-2 py-0.5 rounded text-[11px] font-medium">
                  Optional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Standard Sections Audit Card (With Student Protection) */}
        <div className="p-5 panel">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/8">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7DEFFF]" />
              <span>Common resume sections</span>
            </h2>
            <span className="text-[11px] text-mute/80">Student-friendly</span>
          </div>

          <div className="space-y-2 text-xs">
            {report.sectionsDetected.map((sec, idx) => {
              const isPresent = sec.status === 'present';
              const isAlternative = sec.status === 'alternative_present';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/8"
                >
                  <div>
                    <span className="font-semibold text-ink/85">{sec.sectionName}</span>
                    {isAlternative && (
                      <span className="text-[10px] text-[#7DEFFF] block">
                        Projects and education found
                      </span>
                    )}
                  </div>

                  {isPresent ? (
                    <span className="flex items-center gap-1 text-emerald-300 text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Found</span>
                    </span>
                  ) : isAlternative ? (
                    <span className="flex items-center gap-1 text-[#7DEFFF] text-[11px] font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-[#7DEFFF]" />
                      <span>Covered by projects</span>
                    </span>
                  ) : sec.isOptionalForStudents ? (
                    <span className="text-mute/80 text-[11px]">Optional</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 text-[11px] font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Not found</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comprehensive Checklist Table */}
      <div className="p-6 panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/8">
          <div>
            <h2 className="text-sm font-bold text-ink">
              Check details
            </h2>
            <p className="text-xs text-mute">
              See what was checked, what needs a closer look, and what the app cannot check.
            </p>
          </div>

          {/* Filter categories */}
          <div className="flex items-center gap-1 p-1 bg-white/8 rounded-lg text-xs overflow-x-auto min-w-0 max-w-full">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${activeCategoryFilter === 'all' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategoryFilter('text_extraction')}
              className={`px-2.5 py-1 rounded transition-colors ${activeCategoryFilter === 'text_extraction' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              Extraction
            </button>
            <button
              onClick={() => setActiveCategoryFilter('contact_info')}
              className={`px-2.5 py-1 rounded transition-colors ${activeCategoryFilter === 'contact_info' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              Contact
            </button>
            <button
              onClick={() => setActiveCategoryFilter('sections')}
              className={`px-2.5 py-1 rounded transition-colors ${activeCategoryFilter === 'sections' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              Sections
            </button>
            <button
              onClick={() => setActiveCategoryFilter('formatting_risk')}
              className={`px-2.5 py-1 rounded transition-colors ${activeCategoryFilter === 'formatting_risk' ? 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]' : 'text-mute'}`}
            >
              Formatting
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/8">
          {filteredChecks.map((chk) => {
            const isPass = chk.status === 'pass';
            const isWarning = chk.status === 'warning';
            const isFail = chk.status === 'fail';
            const isUnverified = chk.status === 'unverified';

            return (
              <div key={chk.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isPass && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {isFail && <XCircle className="w-4 h-4 text-rose-300" />}
                    {isUnverified && <QuestionIcon className="w-4 h-4 text-mute/80" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-ink">{chk.title}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        chk.verificationLevel === 'verified'
                          ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                          : chk.verificationLevel === 'approximate'
                          ? 'bg-amber-400/10 text-amber-700 border-amber-200'
                          : 'bg-white/8 text-mute border-white/10'
                      }`}>
                        {chk.verificationLevel === 'verified' ? 'CHECKED' : chk.verificationLevel === 'approximate' ? 'ESTIMATE' : 'NOT CHECKED'}
                      </span>
                    </div>

                    <p className="text-xs text-mute leading-relaxed mb-1">
                      {chk.message}
                    </p>

                    {chk.details && (
                      <span className="text-[11px] text-mute/80 font-mono block">
                        {chk.details}
                      </span>
                    )}

                    {chk.recommendation && (
                      <div className="mt-1.5 text-[11px] text-[#9FE9FF] bg-[#35E7FF]/8 p-2 rounded-md border border-[#35E7FF]/25">
                        <span className="font-semibold">Suggestion: </span>
                        {chk.recommendation}
                      </div>
                    )}
                  </div>
                </div>

                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded self-start shrink-0 ${
                  isPass ? 'bg-emerald-400/10 text-emerald-300' :
                  isWarning ? 'bg-amber-400/10 text-amber-700' :
                  isFail ? 'bg-rose-400/10 text-rose-300' :
                  'bg-white/8 text-mute'
                }`}>
                  {chk.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prioritized Actionable Recommendations */}
      <div className="p-6 panel">
        <h2 className="text-sm font-bold text-ink mb-2">
          Suggestions for a clearer resume
        </h2>
        <p className="text-xs text-mute mb-4">
          These suggestions may make your resume easier to read. Only list skills and experience you really have.
        </p>

        <div className="space-y-3">
          {report.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs ${
                rec.priority === 'high' 
                  ? 'bg-rose-400/6 border-rose-400/30' 
                  : rec.priority === 'medium'
                  ? 'bg-amber-400/10/40 border-amber-200'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-ink">{rec.issue}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  rec.priority === 'high' ? 'bg-rose-500/25 text-rose-100' :
                  rec.priority === 'medium' ? 'bg-amber-400/20 text-amber-100' :
                  'bg-white/12 text-ink/80'
                }`}>
                  {rec.priority} Priority
                </span>
              </div>
              <p className="text-ink/75 font-medium mb-1">
                <span className="text-[#7DEFFF] font-bold">Try this: </span>
                {rec.fix}
              </p>
              <p className="text-[11px] text-mute">
                <span className="font-semibold">Why: </span>
                {rec.reason}
              </p>
            </div>
          ))}

          {report.recommendations.length === 0 && (
            <div className="p-6 text-center text-xs text-emerald-300 bg-emerald-400/10 rounded-xl border border-emerald-400/30">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
              <span>No readability issues were found in these checks.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
