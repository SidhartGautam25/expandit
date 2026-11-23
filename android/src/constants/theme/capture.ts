import { Player } from "../../types/game";
import { palette } from "./palette";
import { COLORS } from "./tokens";
import { lightenColor } from "./utils";

/** Fixed in-game capture colors for player territory */
export const PLAYER_CAPTURE_COLORS = {
  player1: palette.white,
  player2: palette.black,
} as const;

export const RESERVED_CAPTURE_COLORS = [
  PLAYER_CAPTURE_COLORS.player1,
  PLAYER_CAPTURE_COLORS.player2,
];

export function getPlayerCaptureColor(player: Player): string {
  return player === 1 ? PLAYER_CAPTURE_COLORS.player1 : PLAYER_CAPTURE_COLORS.player2;
}

export function getCapturedStrokeColor(playerColor: string): string {
  const h = playerColor.trim().toLowerCase().replace("#", "");
  if (h === "ffffff") return COLORS.captureStrokeLight;
  if (h === "000000") return COLORS.captureStrokeDark;
  return lightenColor(playerColor, 0.35);
}

export function getCapturedCountTextColor(playerColor: string): string {
  const h = playerColor.trim().toLowerCase().replace("#", "");
  if (h === "ffffff") return COLORS.captureCountOnLight;
  if (h === "000000") return COLORS.captureCountOnDark;
  return COLORS.captureCountDefault;
}

/** Board overlay tokens for frozen plots */
export const FREEZE_VISUAL = {
  iceTint: "#7dd3fc",
  iceDeep: "#0284c7",
  iceOverlay: "rgba(56, 189, 248, 0.72)",
  iceShine: "rgba(255, 255, 255, 0.55)",
  ring: "#0369a1",
  ringBright: "#38bdf8",
  ringSoft: "rgba(56, 189, 248, 0.65)",
  badgeBg: "rgba(2, 132, 199, 0.96)",
  badgeBorder: "rgba(255, 255, 255, 0.95)",
  badgeText: palette.white,
  fillMix: 0.48,
} as const;
