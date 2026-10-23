import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { buildRoleProgress, RoleProgress } from '../../services/progress';
import { Button } from '../ui/Button';
import { Disclosure } from '../ui/Disclosure';
import { cn, scoreTone, toneText } from '../../lib/ui';

interface ProgressViewProps {
  history: HistoryItem[];
  onViewAnalysis: (id: string) => void;
  onGoToAnalyze: () => void;
}

const DeltaPill: React.FC<{ delta: number | null; suffix?: string }> = ({
  delta,
  suffix = ' pts vs previous',
}) => {
  if (delta === null) {
    return <span className="tag tag-mute">First analysis</span>;
  }
  if (delta === 0) {
    return (
      <span className="tag tag-mute">
        <Minus className="h-3 w-3" aria-hidden="true" />
        No change
      </span>
    );
  }

  const improved = delta > 0;
  return (
    <span className={cn('tag', improved ? 'tag-mint' : 'tag-warn')}>
      {improved ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
      )}
      {improved ? '+' : ''}
      {delta}
      {suffix}
    </span>
  );
};

const RoleCard: React.FC<{ group: RoleProgress; onViewAnalysis: (id: string) => void }> = ({
  group,
  onViewAnalysis,
}) => {
  const chartData = [...group.items].reverse().map((item, index) => ({
    run: `Run ${index + 1}`,
    date: item.timestamp,
    score: item.overallScore,
  }));

  return (
    <article className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold text-porcelain">{group.jobTitle}</h3>
          <p className="mt-0.5 text-xs text-silver">
            {group.companyName ? `${group.companyName} · ` : ''}
            {group.count} {group.count === 1 ? 'analysis' : 'analyses'} · last {group.latest.timestamp}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <span className={cn('font-mono text-2xl font-semibold tabular-nums', toneText[scoreTone(group.latest.overallScore)])}>
              {group.latest.overallScore}%
            </span>
            <span className="block text-xs text-silver">latest match</span>
          </div>
          <DeltaPill delta={group.delta} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewAnalysis(group.latest.id)}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
        >
          View latest result
        </Button>
        {group.count > 1 && (
          <span className="text-xs text-silver">Best score: {group.bestScore}%</span>
        )}
      </div>

      {group.count > 1 ? (
        <Disclosure
          summary="Score history"
          hint={`${group.count} analyses for this role, newest first`}
          count={group.count}
          lazy
          className="mt-4"
        >
          <div
            className="h-44 w-full"
            role="img"
            aria-label={`Line chart of match scores for ${group.jobTitle} across ${group.count} analyses`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--theme-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="run"
                  tick={{ fontSize: 11, fill: 'var(--color-silver)' }}
                  axisLine={{ stroke: 'var(--theme-border)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--color-silver)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={value => [`${value ?? 0}%`, 'Match score']}
                  labelFormatter={label => {
                    const point = chartData.find(item => item.run === label);
                    return point ? `${label} · ${point.date}` : String(label);
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--color-slate-surface)',
                    borderColor: 'var(--theme-border-strong)',
                    borderRadius: '8px',
                    color: 'var(--color-porcelain)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: 'var(--color-mint)' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Match score"
                  stroke="var(--color-mint)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--color-mint)' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ol className="mt-4 space-y-2">
            {group.items.map((item, index) => {
              const older = group.items[index + 1];
              const delta = older ? Math.round(item.overallScore - older.overallScore) : null;
              const runNumber = group.count - index;

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-porcelain">Run {runNumber}</span>
                      {index === 0 && <span className="tag tag-cyan">Latest</span>}
                      <DeltaPill delta={delta} suffix="" />
                    </div>
                    <p className="mt-1 truncate text-xs text-silver">{item.resumeTitle}</p>
                    <p className="text-[11px] text-silver">{item.timestamp}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('font-mono text-base font-semibold tabular-nums', toneText[scoreTone(item.overallScore)])}>
                      {item.overallScore}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewAnalysis(item.id)}
                      aria-label={`View result from ${item.timestamp}`}
                    >
                      View
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </Disclosure>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-silver">
          Run this job again after editing your resume to start tracking the score change.
        </p>
      )}
    </article>
  );
};

export const ProgressView: React.FC<ProgressViewProps> = ({
  history,
  onViewAnalysis,
  onGoToAnalyze,
}) => {
  const roles = buildRoleProgress(history);
  const trackedRoles = roles.filter(role => role.count > 1);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
            Progress
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-silver">
            See how your match score changes when you analyze the same job again after updating your
            resume.
          </p>
        </div>
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
      </header>

      {roles.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-xs leading-relaxed text-silver">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ion" aria-hidden="true" />
          <span>
            Analyses with the same job title are grouped together, so keep the title consistent when
            you compare a new version of your resume.
            {trackedRoles.length > 0
              ? ` ${trackedRoles.length} ${trackedRoles.length === 1 ? 'role has' : 'roles have'} more than one analysis.`
              : ''}
          </span>
        </p>
      )}

      {roles.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-mint/25 bg-mint/10 text-mint">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-base font-semibold text-porcelain">No progress to show yet</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-silver">
            Analyze a resume, then run the same job again after making changes. Your scores will be
            tracked here over time.
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
      ) : (
        <ul className="space-y-4">
          {roles.map(role => (
            <li key={role.key}>
              <RoleCard group={role} onViewAnalysis={onViewAnalysis} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProgressView;
