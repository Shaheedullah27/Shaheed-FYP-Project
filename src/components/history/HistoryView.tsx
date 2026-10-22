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
} from 'lucide-react';
import { HistoryItem, ActiveTab } from '../../types';
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

  const filterTabs: Array<{ id: typeof scoreFilter; label: string; tone: string }> = [
    { id: 'all', label: `All (${history.length})`, tone: 'text-ink' },
    { id: 'high', label: 'Strong match (75% or more)', tone: 'text-emerald-300' },
    { id: 'medium', label: 'Partial match (50–74%)', tone: 'text-[#7DEFFF]' },
    { id: 'low', label: 'Room to improve (under 50%)', tone: 'text-rose-300' },
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
            <div className="flex items-center gap-2 text-[11px] text-mute mb-1.5">
              <History className="w-3.5 h-3.5 text-[#7DEFFF]" />
              <span>Saved comparisons</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{history.length} saved</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-grad">Past comparisons</h1>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleExportJson}
                className="btn-ghost px-3 py-2 text-xs"
                title="Download all saved comparisons as a JSON file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download history</span>
              </button>
            )}
            <button onClick={onGoToAnalyze} className="btn-primary px-4 py-2 text-xs">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span>New comparison</span>
            </button>
          </div>
        </GlowPanel>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div variants={riseIn}>
        <GlowPanel className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by resume, job title, or company..."
              aria-label="Search saved comparisons"
              className="field"
              style={{ paddingLeft: '2.3rem' }}
            />
          </div>

          <div className="seg overflow-x-auto" role="group" aria-label="Filter by score">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setScoreFilter(tab.id)}
                data-active={scoreFilter === tab.id}
                className={cn('seg-btn', scoreFilter !== tab.id && tab.tone)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </GlowPanel>
      </motion.div>

      {/* History Data Table */}
      <motion.div variants={riseIn}>
        <GlowPanel glow className="overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-9 h-9 text-mute/60 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink mb-1">No saved comparisons yet</p>
              <p className="text-xs text-mute max-w-sm mx-auto mb-6 leading-relaxed">
                Run a comparison and it will be saved here automatically, together with its scores
                and skills breakdown.
              </p>
              <button onClick={onGoToAnalyze} className="btn-primary px-4 py-2 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Start your first comparison
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] border-b border-white/10 text-mute font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Resume</th>
                    <th className="px-5 py-3.5">Job</th>
                    <th className="px-5 py-3.5 text-right">Text match</th>
                    <th className="px-5 py-3.5 text-right">Overall score</th>
                    <th className="px-5 py-3.5 text-right">ATS readability</th>
                    <th className="px-5 py-3.5">Skills found / missing</th>
                    <th className="px-5 py-3.5">Top missing skill</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 text-mute">
                  {filteredHistory.map((item) => {
                    const isHigh = item.overallScore >= 75;
                    const isMed = item.overallScore >= 50 && item.overallScore < 75;
                    const atsScore = item.atsScore || 80;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onViewAnalysis(item.id)}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 font-medium">
                          <div className="font-semibold text-ink truncate max-w-xs group-hover:text-[#7DEFFF] transition-colors">
                            {item.resumeTitle}
                          </div>
                          <div className="text-[11px] text-mute font-mono mt-0.5">{item.timestamp}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="truncate max-w-xs text-ink">{item.jobTitle}</div>
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
                              'font-mono font-bold tabular-nums px-2 py-0.5 rounded-md text-xs border',
                              isHigh
                                ? 'tag-ok'
                                : isMed
                                ? 'tag-ion'
                                : 'tag-bad'
                            )}
                          >
                            {item.overallScore}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="tag tag-plasma font-mono">{atsScore}%</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-emerald-300 font-semibold">{item.matchedSkillCount}</span>
                          <span className="text-mute"> / </span>
                          <span className="font-mono text-rose-300 font-semibold">
                            {item.missingSkillCount} not found
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-medium text-ink bg-white/8 border border-white/10 px-2 py-0.5 rounded-md">
                            {item.topMissingSkill}
                          </span>
                        </td>
                        <td
                          className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleDownloadSingleReport(item.id, e)}
                            className="p-1.5 text-mute hover:text-[#7DEFFF] hover:bg-[#35E7FF]/10 rounded-md transition-colors inline-flex items-center"
                            title="Download this comparison report"
                          >
                            {downloadSuccessId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-300" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onViewAnalysis(item.id)}
                            className="p-1.5 text-mute hover:text-[#7DEFFF] hover:bg-[#35E7FF]/10 rounded-md transition-colors"
                            title="View comparison results"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(item)}
                            className="p-1.5 text-mute hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                            title="Delete this saved comparison"
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
                        No saved comparisons match your search and filters.
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
            {pendingDelete ? ` ↔ ${pendingDelete.jobTitle}` : ''} will be removed from your history,
            including its scores and suggestions. This cannot be undone.
          </>
        }
        confirmLabel="Delete comparison"
        cancelLabel="Keep it"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteHistoryItem(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </motion.div>
  );
};
