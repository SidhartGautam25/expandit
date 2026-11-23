export { palette } from "./palette";
export { withAlpha, hexToRgb, lightenColor } from "./utils";
export { COLORS, type ColorToken } from "./tokens";
export { GAME_SCENE, type GamePanelVariant } from "./scene";
export { GAME_FONT, GAME_TYPOGRAPHY } from "./gameTypography";
export {
  PLAYER_CAPTURE_COLORS,
  RESERVED_CAPTURE_COLORS,
  getPlayerCaptureColor,
  getCapturedStrokeColor,
  getCapturedCountTextColor,
  FREEZE_VISUAL,
} from "./capture";
export { BOX_PALETTE, BOARD_MIX_RGB } from "./board";
export {
  STAR_UI,
  CROWN_UI,
  PLAY_BUTTON,
  CIRCLE_BUTTON,
  MODAL_OUTCOME,
  MODAL_UI,
  getP2VictoryTitleColors,
} from "./gameUi";
export { TYPOGRAPHY } from "./typography";

export const OPACITY_STEPS = [0.0, 0.33, 0.66, 1.0] as const;

export const ANIMATIONS = {
  springConfig: {
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
} as const;
