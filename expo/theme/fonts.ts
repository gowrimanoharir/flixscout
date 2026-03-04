// Typography tokens extracted from flixscout-final.html
// Fonts: Syne (headings) + DM Sans (body) — both from Google Fonts
// Load via @expo-google-fonts/syne and @expo-google-fonts/dm-sans in Phase 6

// ── Font families ─────────────────────────────────────────────────────────
export const fontFamily = {
  heading: 'Syne_800ExtraBold',   // Syne 800 — logo, card titles, empty state heading
  body:    'DMSans_400Regular',   // DM Sans 400 — all body copy, bubbles, metadata
  bodyMed: 'DMSans_500Medium',    // DM Sans 500 — chips, nav badge
  bodySemi:'DMSans_600SemiBold',  // DM Sans 600 — continue button, watch button label
} as const;

// ── Font sizes ────────────────────────────────────────────────────────────
export const fontSize = {
  logo:       17,    // nav logo wordmark (Syne 800)
  heading:    20,    // empty state title (Syne 800)
  cardTitle:  13,    // recommendation card title (Syne 700)
  body:       13.5,  // chat bubbles, main body text (DM Sans 400)
  chip:       12,    // chip labels, suggestion pills, clarify sub-text (DM Sans 500)
  meta:       11,    // year, rating, runtime, genre tags, platform badge (DM Sans 400)
  navBadge:   10,    // "Mid-Fidelity Prototype" badge (DM Sans 500)
  timestamp:  10.5,  // message timestamps (DM Sans 400)
  tab:        11.5,  // screen tab labels (DM Sans 500)
  loadStatus: 11,    // loading status text (DM Sans 400)
} as const;

// ── Font weights ──────────────────────────────────────────────────────────
export const fontWeight = {
  extraBold: '800' as const,   // Syne headings
  bold:      '700' as const,   // Syne card titles
  semiBold:  '600' as const,   // DM Sans buttons, clarify questions
  medium:    '500' as const,   // DM Sans chips, tabs
  regular:   '400' as const,   // DM Sans body
} as const;

// ── Line heights ──────────────────────────────────────────────────────────
export const lineHeight = {
  body:    1.55,   // chat bubbles, synopsis
  sub:     1.6,    // empty state subtitle
  cardTitle: 1.3,  // card title (tight)
} as const;

// ── Letter spacing ────────────────────────────────────────────────────────
export const letterSpacing = {
  logo:    -0.4,   // Syne logo wordmark
  navBadge: 0.03,  // "em" equivalent in pixels ≈ 0.4px at 10px
  tab:     0.15,   // tab labels (0.01em at 11.5px)
} as const;
