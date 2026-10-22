/**
 * One-off theme migration for secondary views.
 * Ordered literal replacements: specific multi-token patterns run BEFORE
 * generic single-class patterns. Safe to run once; prints a coverage report.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  'src/components/skills/SkillGapView.tsx',
  'src/components/dictionary/DictionaryView.tsx',
  'src/components/about/AboutView.tsx',
  'src/components/architecture/BackendGuideView.tsx',
  'src/components/ats/AtsCompatibilityView.tsx',
  'src/components/common/EmptyState.tsx',
  'src/components/common/LoadingSpinner.tsx',
];

/** [from, to] — order matters. */
const pairs = [
  // --- panels -------------------------------------------------------------
  ['bg-white border border-slate-200 rounded-xl shadow-xs', 'panel'],
  ['bg-white border border-slate-200 rounded-xl', 'panel'],
  ['bg-white border rounded-xl shadow-xs', 'panel'],
  ['bg-white border border-slate-200 rounded-2xl', 'panel'],
  ['border border-slate-200 rounded-xl overflow-hidden', 'panel overflow-hidden'],

  // --- specific combined patterns (before generic) ------------------------
  ['bg-white font-semibold text-slate-900 shadow-xs', 'bg-[#35E7FF] font-bold text-[#05080F] shadow-[0_6px_18px_-8px_rgba(53,231,255,0.7)]'],
  ['bg-white font-semibold text-slate-900', 'bg-[#35E7FF] font-bold text-[#05080F]'],
  ['bg-white font-medium text-slate-900', 'bg-[#35E7FF] font-semibold text-[#05080F]'],
  ['bg-slate-900 text-white font-medium', 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F] font-semibold'],
  ['bg-slate-900 hover:bg-slate-800 text-white', 'btn-primary'],
  ['text-white bg-slate-900 hover:bg-slate-800', 'btn-primary text-white'],
  ['bg-slate-900 text-white', 'bg-gradient-to-br from-[#35E7FF] to-[#8B5CFF] text-[#05080F]'],
  ['bg-white px-2 py-0.5 rounded border border-slate-200', 'bg-white/8 px-2 py-0.5 rounded border border-white/12'],
  ['bg-white px-2 py-0.5 rounded border', 'bg-white/8 px-2 py-0.5 rounded border'],
  ['bg-white p-2 rounded border border-slate-200', 'bg-[#35E7FF]/8 p-2 rounded border border-[#35E7FF]/25'],
  ['bg-white p-2 rounded-lg border border-slate-100', 'bg-white/[0.05] p-2 rounded-lg border border-white/10'],
  ['bg-white/80 p-2.5 rounded-lg border border-slate-100', 'bg-white/[0.05] p-2.5 rounded-lg border border-white/10'],
  // regex pairs: must not re-match values this script already inserted
  ['re:bg-white(?!/)', 'bg-white/8'],

  // --- accent chips / icons (indigo) ---------------------------------------
  ['border-indigo-600 ring-2 ring-indigo-500/10', 'border-[#35E7FF]/60 ring-2 ring-[#35E7FF]/20'],
  ['focus:ring-indigo-500/20 focus:border-indigo-500', 'focus:ring-[#35E7FF]/25 focus:border-[#35E7FF]/60'],
  ['focus:ring-purple-500/20 focus:border-purple-500', 'focus:ring-[#8B5CFF]/30 focus:border-[#8B5CFF]/70'],
  ['hover:border-indigo-300', 'hover:border-[#35E7FF]/45'],
  ['hover:border-slate-300', 'hover:border-white/20'],
  ['bg-indigo-50/60', 'bg-[#35E7FF]/6'],
  ['bg-indigo-50/50', 'bg-[#35E7FF]/6'],
  ['hover:bg-indigo-100', 'hover:bg-[#35E7FF]/18'],
  ['bg-indigo-50', 'bg-[#35E7FF]/10'],
  ['border-indigo-200/80', 'border-[#35E7FF]/30'],
  ['border-indigo-200', 'border-[#35E7FF]/25'],
  ['text-indigo-800', 'text-[#9FE9FF]'],
  ['text-indigo-700', 'text-[#7DEFFF]'],
  ['text-indigo-600', 'text-[#7DEFFF]'],
  ['text-indigo-300', 'text-[#9FE9FF]'],
  ['bg-purple-50', 'bg-[#8B5CFF]/12'],
  ['text-purple-600', 'text-[#C4B5FD]'],
  ['border-purple-200', 'border-[#8B5CFF]/30'],

  // --- status accents tuned for dark ---------------------------------------
  ['text-emerald-800', 'text-emerald-200'],
  ['text-emerald-700', 'text-emerald-300'],
  ['text-emerald-600', 'text-emerald-300'],
  ['border-emerald-200/80', 'border-emerald-400/30'],
  ['border-emerald-200/60', 'border-emerald-400/25'],
  ['border-emerald-200', 'border-emerald-400/30'],
  ['hover:bg-emerald-100', 'hover:bg-emerald-400/15'],
  ['bg-emerald-50/40', 'bg-emerald-400/6'],
  ['bg-emerald-50', 'bg-emerald-400/10'],
  ['text-rose-800', 'text-rose-200'],
  ['text-rose-700', 'text-rose-300'],
  ['text-rose-600', 'text-rose-300'],
  ['text-rose-900', 'text-rose-200'],
  ['border-rose-200/80', 'border-rose-400/30'],
  ['border-rose-200/60', 'border-rose-400/25'],
  ['border-rose-200', 'border-rose-400/30'],
  ['bg-rose-50/40', 'bg-rose-400/6'],
  ['bg-rose-50', 'bg-rose-400/10'],
  ['bg-rose-50 border border-rose-200', 'bg-rose-400/10 border border-rose-400/30'],
  ['text-amber-600', 'text-amber-300'],
  ['bg-amber-50', 'bg-amber-400/10'],
  ['text-blue-600', 'text-[#7DEFFF]'],
  ['text-blue-700', 'text-[#7DEFFF]'],
  ['bg-blue-50', 'bg-[#35E7FF]/10'],
  ['border-blue-200', 'border-[#35E7FF]/30'],

  // --- neutrals ------------------------------------------------------------
  ['text-slate-900', 'text-ink'],
  ['text-slate-800', 'text-ink/85'],
  ['text-slate-700', 'text-ink/75'],
  ['text-slate-600', 'text-mute'],
  ['text-slate-500', 'text-mute'],
  ['text-slate-400', 'text-mute/80'],
  ['text-slate-300', 'text-mute'],
  ['text-slate-200', 'text-ink/80'],
  ['divide-slate-100', 'divide-white/8'],
  ['divide-y divide-slate-100', 'divide-y divide-white/8'],
  ['border-slate-100', 'border-white/8'],
  ['border-slate-300', 'border-white/15'],
  ['border-slate-200', 'border-white/10'],
  ['bg-slate-50/70', 'bg-white/[0.03]'],
  ['bg-slate-50/50', 'bg-white/[0.03]'],
  ['bg-slate-50/40', 'bg-white/[0.03]'],
  ['bg-slate-50/20', 'bg-white/[0.03]'],
  ['hover:bg-slate-50', 'hover:bg-white/[0.05]'],
  ['bg-slate-50', 'bg-white/[0.03]'],
  ['hover:bg-slate-200', 'hover:bg-white/12'],
  ['hover:bg-slate-100', 'hover:bg-white/8'],
  ['bg-slate-100', 'bg-white/8'],
  ['hover:text-slate-900', 'hover:text-ink'],
  ['re:text-white(?!/)', 'text-ink'],

  // --- spinner specifics ---------------------------------------------------
  ['border-indigo-100 border-t-indigo-600', 'border-white/10 border-t-[#35E7FF]'],
  ['border-3 border-indigo-100 border-t-indigo-600', 'border-3 border-white/10 border-t-[#35E7FF]'],

  // --- misc ----------------------------------------------------------------
  ['hover:shadow-xs', ''],
  ['shadow-xs', ''],
];

let total = 0;
for (const f of files) {
  const path = join(root, f);
  let src = readFileSync(path, 'utf8');
  let count = 0;
  for (const [from, to] of pairs) {
    if (from.startsWith('re:')) {
      const re = new RegExp(from.slice(3), 'g');
      const matches = src.match(re);
      if (!matches) continue;
      count += matches.length;
      src = src.replace(re, to);
      continue;
    }
    if (!src.includes(from)) continue;
    const parts = src.split(from);
    count += parts.length - 1;
    src = parts.join(to);
  }
  writeFileSync(path, src);
  total += count;
  console.log(`${f}: ${count} replacements`);
}
console.log(`total: ${total}`);
