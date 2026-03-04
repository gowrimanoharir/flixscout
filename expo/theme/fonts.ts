// TODO: Phase 2 — Full font token extraction from flixscout-final.html

export const fonts = {
  heading: 'Syne',
  body: 'DM Sans',
} as const;

export const fontSizes = {
  logo: 17,
  heading: 20,
  body: 13.5,
  meta: 11,
  chip: 12,
  timestamp: 10.5,
} as const;

export const fontWeights = {
  heading: '800' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
} as const;
