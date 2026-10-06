// Shared layout tokens: radius, spacing, and shadow scales used across the
// home screen's cards so every component draws from the same system instead
// of each picking its own numbers. Colors are intentionally untouched here;
// see context/ThemeContext.tsx for the color palette.

export const RADIUS = {
  sm: 12,
  md: 20,
  lg: 24,
} as const;

export const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export const SHADOW = {
  low: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  high: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
