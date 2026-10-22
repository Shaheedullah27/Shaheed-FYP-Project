import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Settings,
  History,
  Lock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sliders,
  AlertOctagon,
  FileText,
  BadgeAlert,
  Terminal,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  SecurityFinding, 
  SecuritySummary, 
  SecurityAuditLogEntry, 
  SecuritySeverity, 
  QuarantineStatus 
} from '../../types';
import { 
  fetchSecuritySummary, 
  fetchSecurityFindings, 
  submitSecurityReview, 
  fetchSecurityAuditLogs,
  fetchSecurityPolicies,
  getFlaskUrl
} from '../../services/api';
import { GlowPanel } from '../ui/GlowPanel';
import { cn, riseIn, stagger } from '../../lib/ui';

export const SecurityDashboardView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'findings' | 'audit' | 'policies'>('findings');
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogEntry[]>([]);
  const [policies, setPolicies] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Detail Modal State
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [reviewAction, setReviewAction] = useState<string>('under_review');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('Lead Security Officer');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadAllSecurityData = async () => {
    setIsRefreshing(true);
    try {
      const [sumData, findData, logsData, polData] = await Promise.all([
        fetchSecuritySummary(),
        fetchSecurityFindings({
          query: searchQuery,
          severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
          reviewer_status: selectedStatus !== 'ALL' ? selectedStatus : undefined
        }),
        fetchSecurityAuditLogs(),
        fetchSecurityPolicies()
      ]);

      setSummary(sumData);
      setFindings(findData.findings);
      setAuditLogs(logsData);
      setPolicies(polData);
    } catch (err) {
      console.error('Error fetching security data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllSecurityData();
  }, [searchQuery, selectedSeverity, selectedStatus]);

  const handleOpenFindingDetails = (finding: SecurityFinding) => {
    setSelectedFinding(finding);
    setReviewFeedback(null);
    setReviewReason('');
    setReviewerNotes('');
    setReviewAction(
      finding.quarantine_status === 'QUARANTINED' ? 'release' :
      finding.reviewer_status === 'unreviewed' ? 'under_review' : 'confirm'
    );
  };

  const handleExecuteReview = async () => {
    if (!selectedFinding) return;
    if (['clear', 'release', 'reject', 'false_positive'].includes(reviewAction) && reviewReason.trim().length < 5) {
      setReviewFeedback({
        message: 'A substantive justification reason (minimum 5 characters) is required for this action.',
        type: 'error'
      });
      return;
    }

    setIsSubmittingReview(true);
    setReviewFeedback(null);

    try {
      const res = await submitSecurityReview({
        target_id: selectedFinding.inspection_id || selectedFinding.id,
        action: reviewAction as any,
        actor: reviewerName,
        reason: reviewReason || 'Administrative status adjustment.',
        reviewer_notes: reviewerNotes
      });

      if (res.success) {
        setReviewFeedback({ message: res.message || 'Review action recorded successfully.', type: 'success' });
        await loadAllSecurityData();
        setSelectedFinding(prev => prev ? {
          ...prev,
          reviewer_status: reviewAction === 'confirm' ? 'confirmed' : reviewAction === 'false_positive' ? 'false_positive' : 'under_review',
          quarantine_status: reviewAction === 'release' || reviewAction === 'clear' ? 'CLEARED' : reviewAction === 'reject' ? 'REJECTED' : prev.quarantine_status
        } : null);
      } else {
        setReviewFeedback({ message: 'Action could not be completed.', type: 'error' });
      }
    } catch (err: any) {
      setReviewFeedback({ message: err.message || 'Failed to submit review action.', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getSeverityBadgeClass = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#FF777F]/15 border-[#FF777F]/40 text-[#FF777F] animate-pulse';
      case 'HIGH':
        return 'bg-[#F4BD73]/15 border-[#F4BD73]/40 text-[#F4BD73]';
      case 'MEDIUM':
        return 'bg-[#F4BD73]/10 border-[#F4BD73]/30 text-[#F4BD73]';
      case 'LOW':
      default:
        return 'bg-[#62D9F5]/15 border-[#62D9F5]/40 text-[#62D9F5]';
    }
  };

  const getStatusBadge = (status?: QuarantineStatus) => {
    switch (status) {
      case 'QUARANTINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FF777F]/15 border border-[#FF777F]/40 text-[#FF777F] shadow-[0_0_12px_rgba(255,119,127,0.25)]">
            <ShieldAlert className="w-3 h-3 text-[#FF777F] animate-pulse" />
            Quarantined
          </span>
        );
      case 'FLAGGED_FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4BD73]/15 border border-[#F4BD73]/40 text-[#F4BD73]">
            <AlertTriangle className="w-3 h-3 text-[#F4BD73]" />
            Flagged Review
          </span>
        );
      case 'CLEARED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#79F2C0]/15 border border-[#79F2C0]/40 text-[#79F2C0]">
            <CheckCircle2 className="w-3 h-3 text-[#79F2C0]" />
            Cleared
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FF777F]/15 border border-[#FF777F]/40 text-[#FF777F]">
            <XCircle className="w-3 h-3 text-[#FF777F]" />
            Rejected
          </span>
        );
      case 'NOT_QUARANTINED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#79F2C0]/10 border border-[#79F2C0]/30 text-[#79F2C0]">
            <ShieldCheck className="w-3 h-3 text-[#79F2C0]" />
            Clean (Verified)
          </span>
        );
    }
  };

  const flaskUrl = getFlaskUrl();

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 pb-12"
    >
      {/* Title & Controls Header */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#79F2C0] mb-1">
              <ShieldAlert className="w-4 h-4 text-[#FF777F]" />
              <span>FORENSIC TELEMETRY & QUARANTINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Resume Manipulation Defense & Policy
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Multi-layer hidden instruction detection, white-on-white text auditing, and administrative quarantine controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08] text-xs">
              {[
                { id: 'findings', label: 'Findings & Quarantine' },
                { id: 'audit', label: 'Audit Trail' },
                { id: 'policies', label: 'Detection Policies' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all',
                    activeSubTab === tab.id 
                      ? 'bg-[#79F2C0] text-[#0B0D12] font-bold shadow-[0_0_12px_rgba(121,242,192,0.3)]' 
                      : 'text-mute hover:text-ink'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadAllSecurityData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-mute hover:text-ink hover:bg-white/[0.08] transition-colors"
              title="Refresh Security Telemetry"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-[#79F2C0]")} />
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Mandatory Incomplete / Alert Banner */}
      {summary && summary.incomplete_count > 0 && (
        <motion.div variants={riseIn}>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F4BD73]/10 border border-[#F4BD73]/30 text-[#F4BD73]">
            <AlertTriangle className="w-5 h-5 text-[#F4BD73] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#F4BD73] block mb-0.5">
                Warning: Image-based content could not be fully inspected. Security analysis is incomplete.
              </span>
              <span className="text-[#F1F0EA]/85">
                Documents containing embedded images require local Tesseract OCR engine to inspect rasterized text. 
                Conservative review policy is active: unverified resumes are automatically flagged for manual reviewer inspection.
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 6 Top Metric Cards */}
      <motion.div variants={riseIn} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <GlowPanel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Total Scanned</span>
            <FileSearch className="w-4 h-4 text-[#62D9F5]" />
          </div>
          <div className="text-2xl font-black text-ink font-mono tabular-nums">
            {summary?.total_inspected ?? 0}
          </div>
          <div className="text-[10px] text-mute font-mono mt-1">Multi-layer parsed</div>
        </GlowPanel>

        <GlowPanel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Clean Documents</span>
            <ShieldCheck className="w-4 h-4 text-[#79F2C0]" />
          </div>
          <div className="text-2xl font-black text-[#79F2C0] font-mono tabular-nums">
            {summary?.clean_count ?? 0}
          </div>
          <div className="text-[10px] text-mute font-mono mt-1">0 threats detected</div>
        </GlowPanel>

        <GlowPanel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Flagged Review</span>
            <AlertTriangle className="w-4 h-4 text-[#F4BD73]" />
          </div>
          <div className="text-2xl font-black text-[#F4BD73] font-mono tabular-nums">
            {summary?.flagged_count ?? 0}
          </div>
          <div className="text-[10px] text-mute font-mono mt-1">Heuristic anomaly</div>
        </GlowPanel>

        <GlowPanel className="p-4 flex flex-col justify-between border-[#FF777F]/30 bg-[#FF777F]/5 shadow-[0_0_15px_rgba(255,119,127,0.1)]">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF777F]">Quarantined</span>
            <ShieldAlert className="w-4 h-4 text-[#FF777F] animate-pulse" />
          </div>
          <div className="text-2xl font-black text-[#FF777F] font-mono tabular-nums">
            {summary?.quarantined_count ?? 0}
          </div>
          <div className="text-[10px] text-[#FF777F]/80 font-mono mt-1">Excluded from pool</div>
        </GlowPanel>

        <GlowPanel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Critical / High</span>
            <AlertOctagon className="w-4 h-4 text-[#FF777F]" />
          </div>
          <div className="text-2xl font-black text-[#FF777F] font-mono tabular-nums">
            {summary?.critical_high_count ?? 0}
          </div>
          <div className="text-[10px] text-mute font-mono mt-1">High-confidence</div>
        </GlowPanel>

        <GlowPanel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-mute mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Incomplete</span>
            <HelpCircle className="w-4 h-4 text-[#F4BD73]" />
          </div>
          <div className="text-2xl font-black text-[#F4BD73] font-mono tabular-nums">
            {summary?.incomplete_count ?? 0}
          </div>
          <div className="text-[10px] text-mute font-mono mt-1">OCR uninspected</div>
        </GlowPanel>
      </motion.div>

      {/* Main Tab Content */}
      {activeSubTab === 'findings' && (
        <motion.div variants={riseIn} className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, filename, snippet, or detection rule..."
                className="field"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1.5 text-xs text-mute font-mono">
                <Filter className="w-3.5 h-3.5" />
                <span>Severity:</span>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-[#131720] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-mute font-mono">
                <span>Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-[#131720] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="unreviewed">Unreviewed</option>
                  <option value="under_review">Under Review</option>
                  <option value="confirmed">Confirmed Concern</option>
                  <option value="false_positive">False Positive</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          <GlowPanel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-mute uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-3 px-4">Candidate & Resume</th>
                    <th className="py-3 px-3">Security Status</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Confidence</th>
                    <th className="py-3 px-4">Detected Anomaly</th>
                    <th className="py-3 px-3">Reviewer Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {findings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-mute">
                        <CheckCircle2 className="w-8 h-8 text-[#79F2C0] mx-auto mb-2 opacity-80" />
                        <span className="block font-medium text-ink">No Security Findings Matching Filter</span>
                        <span className="text-[11px] block mt-0.5">Documents appear free of manipulation patterns.</span>
                      </td>
                    </tr>
                  ) : (
                    findings.map((f) => (
                      <tr 
                        key={f.id}
                        onClick={() => handleOpenFindingDetails(f)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-ink block truncate max-w-[180px] group-hover:text-[#79F2C0] transition-colors">
                            {f.candidate_name || 'Anonymous Applicant'}
                          </span>
                          <span className="text-[11px] text-mute font-mono block truncate max-w-[180px]">
                            {f.filename || 'resume.pdf'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(f.quarantine_status)}
                        </td>

                        <td className="py-3 px-3">
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono font-bold border', getSeverityBadgeClass(f.severity))}>
                            {f.severity}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[10px] font-mono text-mute px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                            {f.confidence}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-[280px]">
                          <span className="font-semibold text-ink block truncate">
                            {f.title}
                          </span>
                          <span className="text-[11px] text-mute truncate block font-mono">
                            {f.snippet || f.description}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="capitalize text-mute text-[11px] font-mono">
                            {f.reviewer_status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFindingDetails(f);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#62D9F5]/10 text-[#62D9F5] border border-[#62D9F5]/30 hover:bg-[#62D9F5]/20 text-[11px] font-mono font-medium transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlowPanel>
        </motion.div>
      )}

      {/* Audit Trail Sub-Tab */}
      {activeSubTab === 'audit' && (
        <motion.div variants={riseIn}>
          <GlowPanel className="overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#79F2C0]" />
                <h3 className="text-sm font-display font-bold text-ink">Immutable Security Audit Trail</h3>
              </div>
              <span className="text-[11px] text-mute font-mono">
                {auditLogs.length} logged security actions
              </span>
            </div>

            <div className="divide-y divide-white/[0.06] text-xs font-mono">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-mute">No security audit records logged yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#F4BD73] font-bold">{log.action}</span>
                        <span className="text-mute">•</span>
                        <span className="text-ink">{log.actor}</span>
                        <span className="text-mute">•</span>
                        <span className="text-[#62D9F5]">{log.target_type} ({log.target_id})</span>
                      </div>
                      {log.reason && (
                        <div className="text-[11px] text-mute mt-1 font-sans">
                          Reason: {log.reason}
                        </div>
                      )}
                    </div>
                    <div className="text-mute text-[10px] shrink-0 font-mono">
                      {log.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowPanel>
        </motion.div>
      )}

      {/* Security Policies Sub-Tab */}
      {activeSubTab === 'policies' && (
        <motion.div variants={riseIn} className="space-y-4">
          <GlowPanel className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Sliders className="w-5 h-5 text-[#79F2C0]" />
              <h3 className="text-sm font-display font-bold text-ink">Detection Thresholds & Quarantine Policies</h3>
            </div>
            <p className="text-xs text-mute mb-6 leading-relaxed">
              These policy parameters govern automated quarantine thresholds, OCR coverage criteria, and font contrast limits.
              Document content is untrusted and cannot override these server-enforced rules.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-ink block">Minimum Visible Font Size (pt)</span>
                <span className="text-[11px] text-mute block">
                  Text rendered below this threshold is treated as micro-font concealment.
                </span>
                <span className="text-sm font-mono text-[#62D9F5] font-bold block pt-1">
                  {policies.min_visible_font_size_pt ?? 3.5} pt
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-ink block">White-on-White Luminance Threshold</span>
                <span className="text-[11px] text-mute block">
                  Relative perceived brightness threshold for low-visibility text detection.
                </span>
                <span className="text-sm font-mono text-[#62D9F5] font-bold block pt-1">
                  {policies.white_text_luminance_threshold ?? 0.92} (92% luminance)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-ink block">Automatic Quarantine on Critical Injection</span>
                <span className="text-[11px] text-mute block">
                  Immediately quarantines candidate from shortlist when prompt injection is detected.
                </span>
                <span className="text-sm font-mono text-[#79F2C0] font-bold block pt-1">
                  {policies.quarantine_on_critical ? 'ENABLED (Strict)' : 'DISABLED'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                <span className="text-xs font-bold text-ink block">Conservative Policy for Incomplete OCR</span>
                <span className="text-[11px] text-mute block">
                  Default status assigned when rasterized image content cannot be OCR-verified.
                </span>
                <span className="text-sm font-mono text-[#F4BD73] font-bold block pt-1">
                  {policies.conservative_incomplete_policy ?? 'FLAGGED_FOR_REVIEW'}
                </span>
              </div>
            </div>
          </GlowPanel>
        </motion.div>
      )}

      {/* Forensic Evidence Detail Modal */}
      <AnimatePresence>
        {selectedFinding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#131720] border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/[0.08] flex items-start justify-between bg-white/[0.02]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn('px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase', getSeverityBadgeClass(selectedFinding.severity))}>
                      {selectedFinding.severity} SEVERITY
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-mute">
                      CONFIDENCE: {selectedFinding.confidence}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#62D9F5]/10 text-[#62D9F5] border border-[#62D9F5]/30">
                      RULE: {selectedFinding.rule_id}
                    </span>
                  </div>
                  <h2 className="text-lg font-display font-bold text-ink">
                    {selectedFinding.title}
                  </h2>
                  <p className="text-xs text-mute mt-0.5">
                    Target: <span className="text-ink font-semibold">{selectedFinding.candidate_name || 'Candidate'}</span> • File: <span className="font-mono text-ink">{selectedFinding.filename}</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedFinding(null)}
                  className="p-1.5 rounded-lg text-mute hover:text-ink hover:bg-white/[0.08] transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* 1. What was detected */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wide">
                    <Terminal className="w-4 h-4 text-[#79F2C0]" />
                    <span>Explainable Finding & Forensics Context</span>
                  </div>
                  <p className="text-mute leading-relaxed">
                    {selectedFinding.description}
                  </p>
                  {selectedFinding.detection_details?.matched_phrase && (
                    <div className="p-2.5 rounded-lg bg-black/60 border border-[#FF777F]/30 text-[#FF777F] font-mono text-[11px]">
                      Matched trigger phrase: "{selectedFinding.detection_details.matched_phrase}"
                    </div>
                  )}
                </div>

                {/* 2. Exact Evidence Snippet */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-mute uppercase tracking-wider block">
                    Concealed Text Snippet (Direct Document Evidence)
                  </span>
                  <div className="p-3.5 rounded-xl bg-black/70 border border-white/[0.08] font-mono text-[11px] text-ink leading-relaxed break-all select-all">
                    {selectedFinding.snippet || 'No plain text snippet extracted.'}
                  </div>
                </div>

                {/* 3. Document Location & Visibility Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-mute block uppercase">Page Number</span>
                    <span className="text-sm font-bold text-ink font-mono mt-0.5 block">
                      Page {selectedFinding.page_number}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-mute block uppercase">Font Color</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedFinding.font_color && (
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0" 
                          style={{ backgroundColor: selectedFinding.font_color }}
                        />
                      )}
                      <span className="text-xs font-bold text-ink font-mono">
                        {selectedFinding.font_color || 'Default'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-mute block uppercase">Font Size</span>
                    <span className="text-xs font-bold text-ink font-mono mt-0.5 block">
                      {selectedFinding.font_size ? `${selectedFinding.font_size} pt` : 'Standard'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-mute block uppercase">Visibility Evidence</span>
                    <span className="text-[11px] font-medium text-[#F4BD73] mt-0.5 block truncate" title={selectedFinding.visibility_evidence}>
                      {selectedFinding.visibility_evidence || 'Stream object'}
                    </span>
                  </div>
                </div>

                {/* 4. Rendered Evidence Preview */}
                {selectedFinding.filename?.toLowerCase().endsWith('.pdf') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-mute uppercase tracking-wider">
                        Rendered Page Visual Inspection (Highlighted Bounding Box)
                      </span>
                      <span className="text-[10px] font-mono text-mute">
                        Safe rendering engine • Zero script execution
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col items-center justify-center min-h-[220px]">
                      <img
                        src={`${flaskUrl}/api/security/evidence/${selectedFinding.inspection_id}/page/${selectedFinding.page_number}`}
                        alt="Document evidence with bounding box highlight"
                        className="max-h-[380px] w-auto object-contain rounded-lg border border-white/15 shadow-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-mute text-center mt-2 font-mono">
                        {selectedFinding.bbox && selectedFinding.bbox.length === 4 ? (
                          <span>Bounding Box Coordinates: [{selectedFinding.bbox.map((v: number) => v.toFixed(1)).join(', ')}]</span>
                        ) : (
                          <span>Visual highlight generated from PDF layout coordinates.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Administrative Decision & Review Actions */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#F4BD73]" />
                      Administrative Decision & Review Action
                    </span>
                    <span className="text-[10px] font-mono text-mute">
                      Current: {selectedFinding.reviewer_status}
                    </span>
                  </div>

                  {reviewFeedback && (
                    <div className={cn(
                      "p-3 rounded-lg text-xs font-medium font-mono",
                      reviewFeedback.type === 'success' ? "bg-[#79F2C0]/15 border border-[#79F2C0]/30 text-[#79F2C0]" : "bg-[#FF777F]/15 border border-[#FF777F]/30 text-[#FF777F]"
                    )}>
                      {reviewFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-mute block mb-1">Select Review Action</label>
                      <select
                        value={reviewAction}
                        onChange={(e) => setReviewAction(e.target.value)}
                        className="field"
                      >
                        <option value="under_review" className="bg-[#131720] text-ink">Mark as Under Active Review</option>
                        <option value="confirm" className="bg-[#131720] text-ink">Confirm Security Concern (Keep Flagged)</option>
                        <option value="false_positive" className="bg-[#131720] text-ink">Mark as False Positive (Preserve Audit)</option>
                        <option value="clear" className="bg-[#131720] text-ink">Clear Resume (Mark Safe)</option>
                        <option value="release" className="bg-[#131720] text-ink">Release from Security Quarantine</option>
                        <option value="reject" className="bg-[#131720] text-ink">Reject Application under Policy</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-mute block mb-1">Acting Reviewer Name</label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        className="field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-mute block mb-1">
                      Review Reason & Findings Justification <span className="text-[#FF777F]">*</span>
                    </label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="Explain the investigative rationale for clearing, confirming, or releasing this candidate document..."
                      rows={2}
                      className="field resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSelectedFinding(null)}
                      className="btn-ghost text-xs"
                    >
                      Close Window
                    </button>
                    <button
                      onClick={handleExecuteReview}
                      disabled={isSubmittingReview}
                      className="btn-primary text-xs"
                    >
                      {isSubmittingReview ? 'Recording Action...' : 'Submit Review Decision'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
