// Layout tokens extracted from flixscout-final.html

// ── Border radius ─────────────────────────────────────────────────────────
export const radius = {
  pill:       20,   // chips, suggestion pills, nav badge, add button
  bubble:     14,   // chat bubbles (top-corner 3 for sender side)
  bubbleTip:  3,    // flattened corner on sender side of bubble
  card:       12,   // recommendation cards
  input:      12,   // input wrap
  cardInner:  7,    // poster image, hint strip inner
  hint:       10,   // hint strip container
  tab:        6,    // screen tabs
  sendBtn:    10,   // send button
  continueBtn:9,    // "Scout it" continue button
  actionBtn:  7,    // watch button, ghost buttons
  genreTag:   4,    // genre tag chips on cards
  platformBadge: 5, // platform badge on cards
  avatar:     999,  // circular avatars (50%)
  countBadge: 10,   // selected count badge
  shimmer:    4,    // loading shimmer lines
  dot:        999,  // blinking loading dot (circular)
} as const;

// ── Fixed heights ─────────────────────────────────────────────────────────
export const layout = {
  navHeight:    54,
  avatarSize:   26,
  posterWidth:  56,
  posterHeight: 82,
  sendBtnSize:  36,
  dotSize:      5,
  shimmerHeight:9,
} as const;

// ── Spacing / padding ─────────────────────────────────────────────────────
export const spacing = {
  chatPadH:   16,   // chat area horizontal padding
  chatPadV:   20,   // chat area vertical padding
  msgGap:     16,   // gap between message rows
  cardPad:    11,   // recommendation card padding
  cardGap:    9,    // gap between cards
  bubblePadH: 13,   // bubble horizontal padding
  bubblePadV: 10,   // bubble vertical padding
  chipPadH:   11,   // chip horizontal padding
  chipPadV:   5,    // chip vertical padding
  inputPadH:  13,   // input field horizontal padding
  inputPadV:  9,    // input field vertical padding
  inputBarH:  14,   // input bar horizontal padding
  inputBarV:  10,   // input bar vertical padding
} as const;
