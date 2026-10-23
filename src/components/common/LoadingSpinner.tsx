import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Plain-language description of the work being done. */
  message?: string;
  /** Optional second line with honest expectations (no invented percentages). */
  hint?: string;
}

/**
 * Honest indeterminate loading state.
 *
 * The analysis engine does not report real progress, so this deliberately
 * shows motion without percentages or fake completed stages.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Analyzing your resume…',
  hint = 'This usually takes a few seconds. Keep this tab open.',
}) => (
  <div
    role="status"
    aria-live="polite"
    className="mx-auto flex w-full max-w-xl flex-col items-center rounded-2xl border border-white/[0.08] bg-graphite p-8 text-center sm:p-10"
  >
    <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-mint">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </div>

    <h2 className="font-heading text-lg font-semibold text-porcelain">{message}</h2>
    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-silver">{hint}</p>

    <div
      aria-hidden="true"
      className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.07]"
    >
      <div className="loading-track h-full w-1/3 rounded-full bg-mint" />
    </div>
    <span className="sr-only">Working. No progress percentage is available.</span>
  </div>
);

export default LoadingSpinner;
