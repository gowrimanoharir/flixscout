// TODO: Phase 2 — Extract full design tokens from flixscout-final.html
// Gradient rule: light (#93C5FD→#C4B5FD) for text/outlines ONLY
//                dark (#1E3A8A→#4C1D95) for filled buttons ONLY

export const colors = {
  bg: '#09090F',
  surface: '#0F0E1A',
  surface2: '#141326',
  surface3: '#1A1830',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  accentSky: '#93C5FD',
  accentLavender: '#C4B5FD',
  text: '#EEF0FF',
  text2: '#7878A0',
  text3: '#3A3A5C',
  starWhite: '#FFFFFF',
} as const;

export const gradients = {
  light: ['#93C5FD', '#C4B5FD'] as const,
  dark: ['#1E3A8A', '#4C1D95'] as const,
} as const;
