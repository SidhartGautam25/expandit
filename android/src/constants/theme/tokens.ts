import { palette } from "./palette";
import { withAlpha } from "./utils";

const ink = palette.slate[900];

/**
 * Semantic color tokens — use these in all UI components.
 * Mapped from palette; update palette.ts to retheme globally.
 */
export const COLORS = {
  // Layout — warm world tones shared with home/game screens
  background: palette.world.land.grassLight,
  cardBackground: palette.world.panel,
  border: palette.world.panelBorder,
  borderSubtle: withAlpha(palette.world.land.soil, 0.18),

  // Text
  text: palette.slate[800],
  textMuted: palette.slate[600],
  onPrimary: palette.white,

  // Board
  tileDefault: palette.white,
  tileDefaultPressed: palette.world.meadow,
  tileBorder: withAlpha(palette.world.wood, 0.25),
  boardBg: palette.world.land.grassLight,

  // Player 1 (blue)
  player1: palette.blue[500],
  player1Dark: palette.blue[600],
  player1Light: palette.blue[600],
  player1Soft: palette.blue[400],
  player1BgSubtle: withAlpha(palette.blue[500], 0.1),
  player1BgSoft: withAlpha(palette.blue[500], 0.14),
  player1BgMedium: withAlpha(palette.blue[500], 0.18),
  player1BgStrong: withAlpha(palette.blue[500], 0.22),

  // Player 2 (red)
  player2: palette.red[500],
  player2Dark: palette.red[600],
  player2Light: palette.red[700],
  player2Soft: palette.red[400],
  player2BgSubtle: withAlpha(palette.red[500], 0.1),
  player2BgSoft: withAlpha(palette.red[500], 0.14),
  player2BgMedium: withAlpha(palette.red[500], 0.18),
  player2BgStrong: withAlpha(palette.red[500], 0.22),
  player2BorderSubtle: withAlpha(palette.red[500], 0.25),

  // Danger plots
  amber: palette.amber[500],
  amberBorder: palette.amber[600],
  dangerFill: palette.amber[200],
  dangerBorder: palette.amber[300],

  // Surfaces & overlays
  glassBg: withAlpha(palette.world.panel, 0.92),
  surfaceMuted: withAlpha(palette.world.wood, 0.1),
  surfaceStrong: withAlpha(palette.world.wood, 0.16),
  overlay: withAlpha(ink, 0.5),
  accentGold: palette.world.accent,
  shadow: withAlpha(palette.world.woodDark, 0.18),
  shadowStrong: withAlpha(palette.black, 0.35),
  textShadow: withAlpha(palette.black, 0.45),
  textShadowLight: withAlpha(palette.white, 0.65),
  shine: withAlpha(palette.white, 0.22),
  inkSubtle: withAlpha(ink, 0.12),

  // Capture stroke helpers
  captureStrokeLight: palette.slate[400],
  captureStrokeDark: palette.slate[500],
  captureCountOnLight: palette.slate[900],
  captureCountOnDark: palette.slate[50],
  captureCountDefault: palette.white,

  // Bot highlight
  botHighlight: palette.red[400],
  botBracket: withAlpha(palette.world.woodDark, 0.85),

  // Power / gold accents
  goldBgSubtle: withAlpha(palette.world.accent, 0.14),
} as const;

export type ColorToken = keyof typeof COLORS;
