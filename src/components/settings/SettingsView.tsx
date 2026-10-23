import React, { useState } from 'react';
import { Moon, Sun, Cpu, ShieldCheck, Download, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  checkFlaskHealth,
  getEngineMode,
  getFlaskUrl,
  setEngineMode,
  setFlaskUrl,
} from '../../services/api';
import { exportHistoryAsJson } from '../../services/storage';
import { cn } from '../../lib/ui';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  historyCount: number;
  onClearHistory: () => void;
}

type HealthState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onThemeChange,
  historyCount,
  onClearHistory,
}) => {
  const [engine, setEngine] = useState<'browser' | 'flask'>(() => getEngineMode());
  const [flaskUrl, setFlaskUrlState] = useState<string>(() => getFlaskUrl());
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });
  const [confirmClear, setConfirmClear] = useState(false);

  const chooseEngine = (mode: 'browser' | 'flask') => {
    setEngine(mode);
    setEngineMode(mode);
    setHealth({ status: 'idle' });
  };

  const saveFlaskUrl = (value: string) => {
    setFlaskUrlState(value);
    setFlaskUrl(value);
    setHealth({ status: 'idle' });
  };

  const testConnection = async () => {
    setHealth({ status: 'testing' });
    const result = await checkFlaskHealth();
    setHealth(
      result.connected
        ? { status: 'success', message: `Connected to the backend${result.version ? ` (version ${result.version})` : ''}.` }
        : {
            status: 'error',
            message:
              'Could not reach the backend. Analyses will still work using the built-in browser engine.',
          }
    );
  };

  const exportHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportHistoryAsJson());
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'ai-resumematch-history.json');
    link.click();
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-porcelain sm:text-2xl">
          Settings
        </h2>
        <p className="mt-1 text-sm text-silver">
          Appearance, how analyses run, and the data saved in this browser.
        </p>
      </header>

      {/* Appearance */}
      <section className="panel p-5" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" className="font-heading text-base font-semibold text-porcelain">
          Appearance
        </h3>
        <p className="mt-0.5 text-sm text-silver">Choose the theme that is easier on your eyes.</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Color theme">
          {[
            { id: 'dark' as const, label: 'Dark', description: 'Light text on a dark background', icon: Moon },
            { id: 'light' as const, label: 'Light', description: 'Dark text on a light background', icon: Sun },
          ].map(option => {
            const active = theme === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onThemeChange(option.id)}
                aria-pressed={active}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-mint/35 bg-mint/[0.07]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-mint' : 'text-silver')} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-porcelain">{option.label}</span>
                  <span className="block text-xs text-silver">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Analysis engine */}
      <section className="panel p-5" aria-labelledby="engine-heading">
        <h3 id="engine-heading" className="font-heading text-base font-semibold text-porcelain">
          How analyses run
        </h3>
        <p className="mt-0.5 text-sm leading-relaxed text-silver">
          Both options use the same scoring method. Use the Python backend only if you run it
          locally.
        </p>

        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Analysis engine">
          {[
            {
              id: 'browser' as const,
              label: 'Built-in engine (recommended)',
              description: 'Runs in this browser. No setup, works offline, nothing leaves your device.',
            },
            {
              id: 'flask' as const,
              label: 'Python backend',
              description: 'Sends the text to the Flask service on your computer for the same analysis.',
            },
          ].map(option => {
            const active = engine === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  active
                    ? 'border-mint/35 bg-mint/[0.07]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
                )}
              >
                <input
                  type="radio"
                  name="analysis-engine"
                  value={option.id}
                  checked={active}
                  onChange={() => chooseEngine(option.id)}
                  className="mt-1 h-4 w-4 accent-mint"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-porcelain">{option.label}</span>
                  <span className="block text-xs leading-relaxed text-silver">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        {engine === 'flask' && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5">
            <label htmlFor="flask-url" className="mb-1.5 block text-xs font-medium text-silver">
              Backend address
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="flask-url"
                type="url"
                value={flaskUrl}
                onChange={event => saveFlaskUrl(event.target.value)}
                placeholder="http://localhost:5000"
                className="field"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={testConnection}
                disabled={health.status === 'testing'}
                leftIcon={
                  health.status === 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cpu className="h-4 w-4" />
                  )
                }
              >
                Test connection
              </Button>
            </div>

            <p
              role="status"
              aria-live="polite"
              className={cn(
                'mt-2 flex items-start gap-1.5 text-xs leading-relaxed',
                health.status === 'error'
                  ? 'text-coral-error'
                  : health.status === 'success'
                  ? 'text-mint'
                  : 'text-silver'
              )}
            >
              {health.status === 'success' && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              {health.status === 'error' && <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              {health.status === 'testing'
                ? 'Checking the backend…'
                : health.status === 'success' || health.status === 'error'
                ? health.message
                : 'If the backend is offline, the app automatically falls back to the built-in engine.'}
            </p>
          </div>
        )}
      </section>

      {/* Local data */}
      <section className="panel p-5" aria-labelledby="data-heading">
        <h3 id="data-heading" className="flex items-center gap-2 font-heading text-base font-semibold text-porcelain">
          <ShieldCheck className="h-4 w-4 text-mint" aria-hidden="true" />
          Your data
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-silver">
          Resumes, job descriptions, and results are saved only in this browser. There is no account
          and no server-side storage.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={exportHistory}
            disabled={historyCount === 0}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export saved analyses
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setConfirmClear(true)}
            disabled={historyCount === 0}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete all saved analyses
          </Button>
        </div>
        <p className="mt-2 text-xs text-silver">
          {historyCount === 0
            ? 'Nothing saved yet.'
            : `${historyCount} saved ${historyCount === 1 ? 'analysis' : 'analyses'} in this browser.`}
        </p>
      </section>

      <ConfirmDialog
        open={confirmClear}
        destructive
        title="Delete all saved analyses?"
        message={
          <>
            All {historyCount} saved {historyCount === 1 ? 'comparison' : 'comparisons'}, including
            scores, skills, and ATS findings, will be removed from this browser. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete everything"
        cancelLabel="Keep my analyses"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          onClearHistory();
          setConfirmClear(false);
        }}
      />
    </div>
  );
};

export default SettingsView;
