import { COLORS } from "./tokens";

/**
 * Shared typography tokens — sizes, weights, and default text colors.
 * Use these instead of hardcoding fontSize / color pairs in components.
 */
export const TYPOGRAPHY = {
  color: {
    primary: COLORS.text,
    muted: COLORS.textMuted,
    onPrimary: COLORS.onPrimary,
    player1: COLORS.player1,
    player1Soft: COLORS.player1Soft,
    player2: COLORS.player2Soft,
    accent: COLORS.accentGold,
    destructive: COLORS.player2Light,
  },

  size: {
    xxs: 8,
    xs: 9,
    sm: 10,
    md: 11,
    base: 12,
    lg: 13,
    xl: 14,
    xxl: 15,
    displaySm: 16,
    displayMd: 18,
    displayLg: 24,
    displayXl: 32,
    display2xl: 36,
    hero: 38,
    score: 26,
    scoreLg: 32,
    icon: 48,
    crown: 54,
  },

  weight: {
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
    black: "900" as const,
  },

  letterSpacing: {
    tight: 0.5,
    normal: 1,
    wide: 1.2,
    wider: 1.5,
    widest: 2,
    logo: 4,
    logoSub: 8,
    logoSubTight: 10,
  },

  lineHeight: {
    snug: 16,
    normal: 18,
  },
} as const;
