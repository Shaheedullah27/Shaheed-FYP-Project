import type { Variants } from 'motion/react';

/** Tiny class name joiner. */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

/** Score → accent tone mapping (used across results, history, skills). */
export const scoreTone = (score: number): 'ion' | 'good' | 'warn' | 'bad' => {
  if (score >= 75) return 'good';
  if (score >= 55) return 'ion';
  if (score >= 40) return 'warn';
  return 'bad';
};

/** Tailwind class sets for each tone — aligned with our Emerald Luxe tokens.
 *  Colors live in index.css as ;theme tokens; these classes keep tone roles stable while both themes stay readable. */
export const toneText: Record<string, string> = {
  ion: 'text-[var(--color-ion)]',
  good: 'text-[var(--color-mint)]',
  warn: 'text-[var(--color-amber-warn)]',
  bad: 'text-[var(--color-coral-error)]',
  violet: 'text-[var(--color-champagne)]',
};

export const toneFill: Record<string, string> = {
  ion: 'bg-[var(--color-ion)]',
  good: 'bg-[var(--color-mint)]',
  warn: 'bg-[var(--color-amber-warn)]',
  bad: 'bg-[var(--color-coral-error)]',
  violet: 'bg-[var(--color-champagne)]',
};

export const toneTag: Record<string, string> = {
  ion: 'tag-cyan',
  good: 'tag-mint',
  warn: 'tag-warn',
  bad: 'tag-bad',
  violet: 'tag-gold',
};

/** True when the user asked the OS for reduced motion. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------
   Motion presets — shared by every view so transitions feel like
   one system instead of per-page improvisation.
   --------------------------------------------------------------- */

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Wrapper props for a section that staggers its children in on scroll. */
export const viewportOnce = { once: true, amount: 0.15 } as const;
