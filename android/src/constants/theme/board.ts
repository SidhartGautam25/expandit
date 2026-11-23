import { palette } from "./palette";
import { COLORS } from "./tokens";
import { hexToRgb } from "./utils";

/** Distinct hues for neutral plots on the board */
export const BOX_PALETTE = [...palette.plot];

/** RGB used when mixing neutral plot fill colors */
export const BOARD_MIX_RGB = hexToRgb(COLORS.boardBg);
