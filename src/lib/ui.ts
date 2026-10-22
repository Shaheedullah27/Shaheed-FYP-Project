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

/** Tailwind class sets for each tone — aligned with our core tokens */
export const toneText: Record<string, string> = {
  ion: 'text-[#62D9F5]',
  good: 'text-[#79F2C0]',
  warn: 'text-[#F4BD73]',
  bad: 'text-[#FF777F]',
  violet: 'text-[#A99BFF]',
};

export const toneFill: Record<string, string> = {
  ion: 'bg-[#62D9F5]',
  good: 'bg-[#79F2C0]',
  warn: 'bg-[#F4BD73]',
  bad: 'bg-[#FF777F]',
  violet: 'bg-[#A99BFF]',
};

export const toneTag: Record<string, string> = {
  ion: 'tag-cyan',
  good: 'tag-mint',
  warn: 'tag-warn',
  bad: 'tag-bad',
  violet: 'tag-violet',
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
