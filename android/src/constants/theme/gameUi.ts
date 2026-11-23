import { palette } from "./palette";
import { COLORS } from "./tokens";
import { PLAYER_CAPTURE_COLORS } from "./capture";

/** 3D star / title decoration colors */
export const STAR_UI = {
  active: palette.amber[400],
  activeHighlight: palette.amber[100],
  shadow: palette.amber[600],
  outline: palette.amber[700],
  inactive: palette.slate[300],
  inactiveShadow: palette.slate[400],
  inactiveOutline: palette.slate[500],
} as const;

export const CROWN_UI = {
  outline: palette.amber[700],
} as const;

/** Home-screen 3D play button */
export const PLAY_BUTTON = palette.playButton;

/** Home-screen circular action buttons */
export const CIRCLE_BUTTON = palette.circleButton;

/** End-game modal banner & accent presets */
export const MODAL_OUTCOME = {
  botVictory: {
    bannerBg: "#6B21A8",
    bannerBorder: "#C084FC",
    accent: "#FFB800",
    titleColor: "#FFC700",
    titleShadow: "#C45A00",
    titleOutline: "#7C2D12",
    bannerText: COLORS.onPrimary,
  },
  p1Victory: {
    bannerBg: "#1E3A8A",
    bannerBorder: "#60A5FA",
    accent: "#3B82F6",
    titleColor: "#60A5FA",
    titleShadow: "#1D4ED8",
    titleOutline: "#172554",
    bannerText: COLORS.onPrimary,
  },
  botDefeat: {
    bannerBg: "#A81325",
    bannerBorder: "#FF5266",
    accent: "#FF334B",
    titleColor: "#FF334B",
    titleShadow: "#B91C1C",
    titleOutline: "#6B000B",
    bannerText: COLORS.onPrimary,
  },
  p2Victory: {
    bannerBg: palette.slate[900],
    bannerBorder: palette.gray[600],
    accent: palette.slate[800],
    bannerText: COLORS.onPrimary,
  },
  draw: {
    bannerBg: palette.gray[700],
    bannerBorder: palette.gray[500],
    accent: "#F59E0B",
    titleColor: "#FFC700",
    titleShadow: "#C45A00",
    titleOutline: "#78350F",
    bannerText: COLORS.onPrimary,
  },
} as const;

export const MODAL_UI = {
  starActive: palette.amber[400],
  starInactive: COLORS.border,
  vsBadgeBg: palette.amber[400],
  vsBadgeBorder: palette.amber[700],
  vsBadgeText: palette.amber[700],
  goldButtonBg: palette.amber[400],
  goldButtonBorder: palette.amber[700],
  goldButtonText: palette.amber[700],
  goldButtonShadow: palette.amber[700],
} as const;

/** Resolve P2 victory title colors when capture color varies */
export function getP2VictoryTitleColors(player2ColorHex: string) {
  const isLight =
    player2ColorHex.toLowerCase() === PLAYER_CAPTURE_COLORS.player1.toLowerCase() ||
    player2ColorHex.toLowerCase() === palette.slate[50].toLowerCase();
  return {
    titleColor: player2ColorHex,
    titleShadow: isLight ? palette.gray[300] : palette.slate[800],
    titleOutline: isLight ? palette.gray[600] : palette.slate[900],
  };
}
