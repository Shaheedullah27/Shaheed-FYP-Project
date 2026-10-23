import React, { useMemo, useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Download,
  ArrowRight,
  Check,
  Sparkles,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { exportHistoryAsJson, getAnalysisById } from '../../services/storage';
import { downloadHtmlReport } from '../../services/reportGenerator';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';
import { cn, scoreTone, toneText } from '../../lib/ui';

interface HistoryViewProps {
  history: HistoryItem[];
  onViewAnalysis: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onGoToAnalyze: () => void;
  onGoToProgress: () => void;
}

type ScoreFilter = 'all' | 'strong' | 'partial' | 'low';

const FILTERS: Array<{ id: ScoreFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'strong', label: 'Strong (75+)' },
  { id: 'partial', label: 'Partial (55–74)' },
  { id: 'low', label: 'Low (below 55)' },
];

const matchesFilter = (score: number, filter: ScoreFilter) => {
  if (filter === 'strong') return score >= 75;
  if (filter === 'partial') return score >= 55 && score < 75;
  if (filter === 'low') return score < 55;
  return true;
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onViewAnalysis,
  onDeleteHistoryItem,
  onGoToAnalyze,
  onGoToProgress,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);

  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return history.filter(item => {
      if (!matchesFilter(item.overallScore, scoreFilter)) return false;
      if (!query) return true;
      return (
        item.resumeTitle.toLowerCase().includes(query) ||
        item.jobTitle.toLowerCase().includes(query) ||
        (item.companyName || '').toLowerCase().includes(query)
      );
    });
  }, [history, scoreFilter, searchTerm]);

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(exportHistoryAsJson());
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'ai-resumematch-history.json');
    link.click();
  };

  const handleDownloadReport = (id: string) => {
    const record = getAnalysisById(id);
    if (!record) return;
    downloadHtmlReport(record);
    setDownloadedId(id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            Analysis history
          </h2>
          <p className="mt-1 text-sm text-silver">
            {history.length === 0
              ? 'Saved comparisons will appear here.'
              : `${history.length} saved ${history.length === 1 ? 'comparison' : 'comparisons'} in this browser.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGoToProgress}
              leftIcon={<TrendingUp className="h-3.5 w-3.5" />}
            >
              Progress
            </Button>
          )}
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportJson}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Export list
            </Button>
          )}
          {history.length > 0 && (
            <Button
              variant="primary"
              size="md"
              onClick={onGoToAnalyze}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Analyze a resume
            </Button>
          )}
        </div>
      </header>

      {history.length > 0 && (
        <div className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <label htmlFor="history-search" className="sr-only">
              Search saved analyses
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver"
                aria-hidden="true"
              />
              <input
                id="history-search"
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search by resume, job title, or company"
                className="field pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by match score">
            {FILTERS.map(filter => {
              const active = scoreFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setScoreFilter(filter.id)}
                  aria-pressed={active}
                  className={cn(
                    'min-h-9 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-mint/30 bg-mint/10 text-mint'
                      : 'border-transparent text-silver hover:bg-white/[0.04] hover:text-porcelain'
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-mint/25 bg-mint/10 text-mint">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-base font-semibold text-porcelain">No saved analyses yet</h3>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-silver">
            Every comparison you run is saved here with its job title, date, and match score.
          </p>
          <Button
            variant="primary"
            size="md"
            className="mt-5"
            onClick={onGoToAnalyze}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Analyze My Resume
          </Button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <p className="text-sm font-medium text-porcelain">No saved analyses match this view</p>
          <p className="mt-1 text-sm text-silver">Try a different search term or score filter.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchTerm('');
              setScoreFilter('all');
            }}
          >
            Clear search and filters
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08] bg-graphite">
          {filteredHistory.map(item => {
            const tone = scoreTone(item.overallScore);
            return (
              <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-porcelain">{item.jobTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-silver">
                    {item.resumeTitle}
                    {item.companyName ? ` · ${item.companyName}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-silver">
                    {item.timestamp} · {item.matchedSkillCount} skills matched ·{' '}
                    {item.missingSkillCount} missing
                    {item.topMissingSkill && item.topMissingSkill !== 'None'
                      ? ` · biggest gap: ${item.topMissingSkill}`
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn('font-mono text-lg font-semibold tabular-nums', toneText[tone])}>
                    {item.overallScore}%
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewAnalysis(item.id)}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    View results
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDownloadReport(item.id)}
                    aria-label={`Download the report for ${item.jobTitle}`}
                    title="Download report"
                    className="rounded-lg p-2 text-silver transition-colors hover:bg-white/[0.05] hover:text-mint"
                  >
                    {downloadedId === item.id ? (
                      <Check className="h-4 w-4 text-mint" aria-hidden="true" />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    aria-label={`Delete the comparison for ${item.jobTitle}`}
                    title="Delete this comparison"
                    className="rounded-lg p-2 text-silver transition-colors hover:bg-coral-error/10 hover:text-coral-error"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-2 px-1 text-xs text-silver">
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        History is stored locally in this browser. Deleting a comparison cannot be undone.
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        title="Delete this saved comparison?"
        message={
          <>
            <span className="font-semibold text-porcelain">{pendingDelete?.resumeTitle}</span>
            {pendingDelete ? ` · ${pendingDelete.jobTitle}` : ''} will be removed from your history,
            including its scores, skills, and ATS findings.
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
    </div>
  );
};

export default HistoryView;
