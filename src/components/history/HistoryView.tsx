import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  History,
  Search,
  Trash2,
  Download,
  ArrowRight,
  Check,
  Sparkles,
  FileText,
  Filter
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { exportHistoryAsJson, getAnalysisById } from '../../services/storage';
import { downloadHtmlReport } from '../../services/reportGenerator';
import { GlowPanel } from '../ui/GlowPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { cn, riseIn, stagger } from '../../lib/ui';

interface HistoryViewProps {
  history: HistoryItem[];
  onViewAnalysis: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onGoToAnalyze: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onViewAnalysis,
  onDeleteHistoryItem,
  onGoToAnalyze,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      item.resumeTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (scoreFilter === 'high') return item.overallScore >= 75;
    if (scoreFilter === 'medium') return item.overallScore >= 50 && item.overallScore < 75;
    if (scoreFilter === 'low') return item.overallScore < 50;

    return true;
  });

  const handleExportJson = () => {
    const jsonStr = exportHistoryAsJson();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `ai-resumematch-history.json`);
    dlAnchorElem.click();
  };

  const handleDownloadSingleReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const record = getAnalysisById(id);
    if (record) {
      downloadHtmlReport(record);
      setDownloadSuccessId(id);
      setTimeout(() => setDownloadSuccessId(null), 2000);
    }
  };

  const filterTabs: Array<{ id: typeof scoreFilter; label: string; activeColor: string }> = [
    { id: 'all', label: `All Records (${history.length})`, activeColor: 'bg-white/10 text-ink border-white/20' },
    { id: 'high', label: 'Strong (≥ 75%)', activeColor: 'bg-[#79F2C0]/15 text-[#79F2C0] border-[#79F2C0]/30' },
    { id: 'medium', label: 'Moderate (50–74%)', activeColor: 'bg-[#62D9F5]/15 text-[#62D9F5] border-[#62D9F5]/30' },
    { id: 'low', label: 'Low (< 50%)', activeColor: 'bg-[#FF777F]/15 text-[#FF777F] border-[#FF777F]/30' },
  ];

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
              <History className="w-4 h-4" />
              <span>SAVED COMPARISON ARCHIVE</span>
              <span className="text-mute">·</span>
              <span className="text-mute font-mono">{history.length} records</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-ink">
              Analysis History & Performance Log
            </h1>
            <p className="text-xs text-mute mt-0.5">
              Review past matching runs, download standalone audit reports, or re-open full analysis breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleExportJson}
                className="btn-ghost text-xs"
                title="Download all saved comparisons as a JSON file"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-mute" />
                <span>Export JSON</span>
              </button>
            )}
            <button onClick={onGoToAnalyze} className="btn-primary text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>New Analysis</span>
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by resume, target role, or company..."
              aria-label="Search saved comparisons"
              className="field"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs" role="group" aria-label="Filter by score">
            {filterTabs.map((tab) => {
              const active = scoreFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setScoreFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all whitespace-nowrap border',
                    active 
                      ? `${tab.activeColor} font-bold shadow-sm` 
                      : 'border-transparent text-mute hover:text-ink hover:bg-white/[0.04]'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </GlowPanel>
      </motion.div>

      {/* History Data Table */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="overflow-hidden">
          {history.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-mute">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-base font-display font-bold text-ink mb-1">No Saved Analyses Yet</h3>
              <p className="text-xs text-mute max-w-sm mx-auto mb-6 leading-relaxed">
                When you compare a resume with a job posting in Match Studio, the deterministic scores and skill gap metrics are automatically archived here.
              </p>
              <button onClick={onGoToAnalyze} className="btn-primary text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Launch First Analysis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/[0.08] text-mute font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Resume Spec</th>
                    <th className="px-5 py-3.5 font-semibold">Target Position</th>
                    <th className="px-5 py-3.5 text-right font-semibold">TF-IDF Overlap</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Harmonic Score</th>
                    <th className="px-5 py-3.5 text-right font-semibold">ATS Readability</th>
                    <th className="px-5 py-3.5 font-semibold">Skills (Matched / Missing)</th>
                    <th className="px-5 py-3.5 font-semibold">Primary Skill Gap</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-mute">
                  {filteredHistory.map((item) => {
                    const isHigh = item.overallScore >= 75;
                    const isMed = item.overallScore >= 50 && item.overallScore < 75;
                    const atsScore = item.atsScore || 80;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onViewAnalysis(item.id)}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 font-medium">
                          <div className="font-semibold text-ink truncate max-w-xs group-hover:text-[#79F2C0] transition-colors">
                            {item.resumeTitle}
                          </div>
                          <div className="text-[11px] text-mute font-mono mt-0.5">{item.timestamp}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="truncate max-w-xs text-ink font-medium">{item.jobTitle}</div>
                          {item.companyName && (
                            <div className="text-[11px] text-mute">{item.companyName}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-ink">
                          {item.cosineSimilarity}%
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className={cn(
                              'font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full text-xs border inline-block',
                              isHigh
                                ? 'bg-[#79F2C0]/10 text-[#79F2C0] border-[#79F2C0]/30'
                                : isMed
                                ? 'bg-[#62D9F5]/10 text-[#62D9F5] border-[#62D9F5]/30'
                                : 'bg-[#FF777F]/10 text-[#FF777F] border-[#FF777F]/30'
                            )}
                          >
                            {item.overallScore}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-mono font-semibold px-2 py-0.5 rounded text-xs bg-[#A99BFF]/10 text-[#A99BFF] border border-[#A99BFF]/25">
                            {atsScore}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[#79F2C0] font-semibold">{item.matchedSkillCount}</span>
                          <span className="text-mute"> / </span>
                          <span className="font-mono text-[#FF777F] font-semibold">
                            {item.missingSkillCount} missing
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-mono text-ink bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-md truncate inline-block max-w-[140px]">
                            {item.topMissingSkill || 'None'}
                          </span>
                        </td>
                        <td
                          className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleDownloadSingleReport(item.id, e)}
                            className="p-1.5 text-mute hover:text-[#79F2C0] hover:bg-[#79F2C0]/10 rounded-lg transition-colors inline-flex items-center"
                            title="Download Standalone HTML Report"
                          >
                            {downloadSuccessId === item.id ? (
                              <Check className="w-4 h-4 text-[#79F2C0]" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onViewAnalysis(item.id)}
                            className="p-1.5 text-mute hover:text-[#62D9F5] hover:bg-[#62D9F5]/10 rounded-lg transition-colors inline-flex items-center"
                            title="Open Analysis View"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(item)}
                            className="p-1.5 text-mute hover:text-[#FF777F] hover:bg-[#FF777F]/10 rounded-lg transition-colors inline-flex items-center"
                            title="Delete Analysis Record"
                            aria-label={`Delete ${item.resumeTitle} comparison`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-xs text-mute">
                        No saved records match your current query and score filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlowPanel>
      </motion.div>

      {/* Safe deletion confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        title="Delete this saved comparison?"
        message={
          <>
            <span className="font-semibold text-ink">{pendingDelete?.resumeTitle}</span>
            {pendingDelete ? ` ↔ ${pendingDelete.jobTitle}` : ''} will be permanently removed from your history,
            including all associated scores, skill mappings, and ATS findings.
          </>
        }
        confirmLabel="Delete Record"
        cancelLabel="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteHistoryItem(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </motion.div>
  );
};
