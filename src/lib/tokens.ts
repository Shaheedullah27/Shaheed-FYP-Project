/**
 * Design Tokens for AI ResumeMatch
 * Editorial, technical, and distinctive SaaS visual identity.
 *
 * Core Tokens:
 * - Obsidian background: #0B0D12
 * - Deep graphite: #131720
 * - Elevated slate: #1B2230
 * - Porcelain text: #F1F0EA
 * - Muted silver: #A1A8B5
 * - Electric mint accent (brand): #79F2C0
 * - Arctic cyan accent (analytical): #62D9F5
 * - Soft violet accent (restrained secondary): #A99BFF
 * - Amber warning: #F4BD73
 * - Coral error: #FF777F
 */

export const tokens = {
  colors: {
    // Primary architectural surfaces
    obsidian: '#0B0D12',
    graphite: '#131720',
    slate: '#1B2230',

    // Typography
    porcelain: '#F1F0EA',
    silver: '#A1A8B5',

    // Semantic accents
    mint: '#79F2C0',     // Signature brand accent
    cyan: '#62D9F5',     // Analytical / informational
    violet: '#A99BFF',   // Secondary restrained
    amber: '#F4BD73',    // Actual warning states
    coral: '#FF777F',    // Actual error states
  },

  typography: {
    fonts: {
      heading: '"Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    tracking: {
      tighter: '-0.03em',
      tight: '-0.015em',
      normal: '0em',
      wide: '0.04em',
      wider: '0.08em',
      widest: '0.14em',
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
    subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
    lift: '0 12px 32px -8px rgba(0, 0, 0, 0.7)',
    elevated: '0 20px 48px -12px rgba(0, 0, 0, 0.85)',
    mintSm: '0 0 0 1px rgba(121, 242, 192, 0.2), 0 4px 16px -4px rgba(121, 242, 192, 0.25)',
    cyanSm: '0 0 0 1px rgba(98, 217, 245, 0.2), 0 4px 16px -4px rgba(98, 217, 245, 0.2)',
  },

  borders: {
    hairline: '1px solid rgba(241, 240, 234, 0.08)',
    hairlineStrong: '1px solid rgba(241, 240, 234, 0.16)',
    mint: '1px solid rgba(121, 242, 192, 0.3)',
    cyan: '1px solid rgba(98, 217, 245, 0.3)',
    violet: '1px solid rgba(169, 155, 255, 0.3)',
    amber: '1px solid rgba(244, 189, 115, 0.3)',
    coral: '1px solid rgba(255, 119, 127, 0.3)',
  },

  transitions: {
    fast: '0.15s ease',
    normal: '0.22s cubic-bezier(0.22, 1, 0.36, 1)',
    slow: '0.35s ease',
  },
} as const;

export type ColorToken = keyof typeof tokens.colors;
