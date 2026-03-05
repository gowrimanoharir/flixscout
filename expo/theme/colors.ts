// Design tokens extracted from flixscout-final.html
//
// GRADIENT RULE — non-negotiable:
//   light (#93C5FD → #C4B5FD) → text / outline context ONLY (logo, selected chip borders, highlights)
//   dark  (#1E3A8A → #4C1D95) → filled button surfaces ONLY (send button, continue button, AI avatar)
//   Never mix both on the same or adjacent elements.

// ── Base surfaces ──────────────────────────────────────────────────────────
export const colors = {
  bg:             '#09090F',   // app background
  surface:        '#0F0E1A',   // nav, tab bar
  surface2:       '#141326',   // chat bubbles, card backgrounds, input wrap
  surface3:       '#1A1830',   // chip backgrounds, input fields, rec cards
  navBg:          'rgba(9,9,15,0.93)',   // nav with blur
  inputBarBg:     'rgba(9,9,15,0.90)',   // input bar with blur

  // ── Borders ──────────────────────────────────────────────────────────────
  border:         'rgba(255,255,255,0.07)',   // default borders
  border2:        'rgba(255,255,255,0.12)',   // elevated borders

  // ── Accent pair ──────────────────────────────────────────────────────────
  accentSky:      '#93C5FD',   // sky blue — text accents, selected chip text, logo gradient start
  accentLavender: '#C4B5FD',   // lavender — logo gradient end, custom chip text

  // ── Text ─────────────────────────────────────────────────────────────────
  text:           '#EEF0FF',   // primary text
  text2:          '#7878A0',   // secondary text, metadata
  text3:          '#3A3A5C',   // placeholder, timestamps

  // ── Semantic ─────────────────────────────────────────────────────────────
  starWhite:      '#FFFFFF',
  ratingYellow:   '#FCD34D',   // IMDb-style star rating

  // ── Alpha variants (used across multiple components) ─────────────────────
  // Sky alpha
  skyAlpha05:     'rgba(147,197,253,0.05)',
  skyAlpha10:     'rgba(147,197,253,0.10)',
  skyAlpha12:     'rgba(147,197,253,0.12)',
  skyAlpha20:     'rgba(147,197,253,0.20)',
  skyAlpha25:     'rgba(147,197,253,0.25)',
  skyAlpha30:     'rgba(147,197,253,0.30)',
  skyAlpha35:     'rgba(147,197,253,0.35)',
  skyAlpha45:     'rgba(147,197,253,0.45)',
  // Lavender alpha
  lavAlpha07:     'rgba(196,181,253,0.07)',
  lavAlpha10:     'rgba(196,181,253,0.10)',
  lavAlpha12:     'rgba(196,181,253,0.12)',
  lavAlpha18:     'rgba(196,181,253,0.18)',
  lavAlpha20:     'rgba(196,181,253,0.20)',
  lavAlpha25:     'rgba(196,181,253,0.25)',
  lavAlpha30:     'rgba(196,181,253,0.30)',

  // ── Error state ───────────────────────────────────────────────────────────
  errorBg:        'rgba(239,68,68,0.08)',
  errorBorder:    'rgba(239,68,68,0.25)',
  errorText:      'rgba(252,165,165,1)',
} as const;

// ── Gradients ─────────────────────────────────────────────────────────────
// For use with expo-linear-gradient: <LinearGradient colors={gradients.light} start={...} end={...}>
export const gradients = {
  // Light → text/outline context only
  light: ['#93C5FD', '#C4B5FD'] as const,
  // Dark → filled button/surface context only
  dark:  ['#1E3A8A', '#4C1D95'] as const,
} as const;

// ── Gradient angle helper (135deg = start top-left, end bottom-right) ─────
export const gradientAngle = {
  start: { x: 0, y: 0 },
  end:   { x: 1, y: 1 },
} as const;
