/**
 * Design Tokens for AI ResumeMatch — Emerald Luxe
 * Layered forest greens, emerald actions, mint highlights, champagne gold.
 *
 * Core palette (exact):
 * - Forest Green anchor: #102A28
 * - Deep Forest surface: #163A33
 * - Emerald action: #138A72
 * - Mint highlight: #65DDB5
 * - Champagne Gold accent: #D8B76A
 * - Warm Ivory text: #F1EBDD
 * - Pale Sage tint: #E8F1EB
 * - Muted Text: #75847D
 *
 * Derived tints (documented, used for elevation & readability only):
 * - #142F2A   — between Forest and Deep Forest (raised dark surface)
 * - #1C443C   — elevated green-tinted card surface
 * - #A3B5AB   — readable muted-on-dark
 * - #4FC9A4   — lifted emerald for informational tones on dark
 * - #5E6F66   — readable muted-on-light
 * - #0E7B62   — emerald darkened for light-bg highlights
 * - #8A6B1F   — champagne darkened for light-bg accents
 */

export const tokens = {
  colors: {
    // Exact Emerald Luxe palette
    forest: '#102A28',
    deepForest: '#163A33',
    emerald: '#138A72',
    mint: '#65DDB5',
    champagne: '#D8B76A',
    ivory: '#F1EBDD',
    paleSage: '#E8F1EB',
    mutedText: '#75847D',

    // Derived surface ramp & readability tints
    graphite: '#142F2A',
    slate: '#1C443C',
    porcelain: '#F1EBDD',
    silver: '#A3B5AB',

    // Semantic accents
    ion: '#4FC9A4',      // Informational (lifted emerald, dark)
    ionLight: '#0E7B62', // Informational (light theme)
    goldLight: '#8A6B1F',        // Champagne readable on light
    amber: '#E7B45E',    // Warning (dark)
    amberLight: '#8F5C0B', // Warning (light)
    coral: '#F58F8B',    // Error (dark)
    coralLight: '#C13A3A', // Error (light)
  },

  typography: {
    fonts: {
      heading: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      body: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    /** Desktop reference scale; mobile runs through the clamp() tokens in index.css. */
    typeScale: {
      pageTitle: { size: 'clamp(28px, 1.4rem + 1.6vw, 34px)', weight: 600, lineHeight: 1.25 },
      sectionHeading: { size: 'clamp(20px, 1.15rem + 0.7vw, 24px)', weight: 600, lineHeight: 1.3 },
      cardHeading: { size: 'clamp(17px, 1rem + 0.4vw, 19px)', weight: 600, lineHeight: 1.3 },
      body: { size: '15px', weight: 400, lineHeight: 1.6 },
      uiLabel: { size: '14px', weight: 500, lineHeight: 1.5 },
      supporting: { size: '13px', weight: 400, lineHeight: 1.55 },
      metadata: { size: '12px', weight: 400, lineHeight: 1.5 },
    },
    tracking: {
      headings: '-0.01em',
      normal: '0em',
      subtle: '0.01em',
    },
  },

  radii: {
    none: '0px',
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    full: '9999px',
  },

  shadows: {
    subtle: '0 1px 3px 0 rgba(4, 14, 12, 0.45)',
    lift: '0 12px 32px -8px rgba(4, 14, 12, 0.65)',
    elevated: '0 20px 48px -12px rgba(4, 14, 12, 0.75)',
    mintSm: '0 0 0 1px rgba(101, 221, 181, 0.22), 0 4px 16px -4px rgba(101, 221, 181, 0.25)',
    emeraldSm: '0 0 0 1px rgba(19, 138, 114, 0.3), 0 6px 18px -4px rgba(19, 138, 114, 0.4)',
  },

  borders: {
    hairline: '1px solid rgba(241, 235, 221, 0.09)',
    hairlineStrong: '1px solid rgba(241, 235, 221, 0.18)',
    mint: '1px solid rgba(101, 221, 181, 0.3)',
    emerald: '1px solid rgba(19, 138, 114, 0.35)',
    gold: '1px solid rgba(216, 183, 106, 0.3)',
    amber: '1px solid rgba(231, 180, 94, 0.3)',
    coral: '1px solid rgba(245, 143, 139, 0.3)',
  },

  transitions: {
    fast: '0.15s ease',
    normal: '0.22s cubic-bezier(0.22, 1, 0.36, 1)',
    slow: '0.35s ease',
  },
} as const;

export type ColorToken = keyof typeof tokens.colors;
