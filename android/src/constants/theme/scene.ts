import { palette } from "./palette";
import { withAlpha } from "./utils";

const ui = palette.world.ui;
const land = palette.world.land;

/**
 * Board-screen scene tokens — Onet-inspired peach/cream UI (not the game grid).
 */
export const GAME_SCENE = {
  backgroundGradient: [ui.screenTop, ui.screen, ui.screenBottom] as const,
  backgroundLocations: [0, 0.45, 1] as const,

  decor: {
    enabled: false,
    flowerPink: land.flowerPink,
    flowerYellow: land.flowerYellow,
    flowerPurple: land.flowerPurple,
    crop: land.crop,
    grass: land.grass,
    opacity: 0,
  },

  text: {
    title: ui.chocolate,
    label: ui.chocolateSoft,
    primary: ui.chocolate,
    secondary: ui.chocolateSoft,
    muted: withAlpha(ui.chocolateSoft, 0.85),
    value: ui.navy,
    accent: ui.chocolate,
    onAccent: palette.white,
    onSky: ui.navy,
  },

  panel: {
    bg: ui.card,
    border: withAlpha(ui.shadow, 0.18),
    shadow: withAlpha(ui.shadow, 0.22),
    highlight: withAlpha(palette.white, 0.5),
  },

  panels: {
    card: {
      depth: 0,
      radius: 20,
      fill: ui.card,
      border: withAlpha(ui.shadow, 0.12),
      borderWidth: 1,
      shadow: withAlpha(ui.shadow, 0.2),
      shadowOffsetY: 4,
      shadowRadius: 10,
    },
    stat: {
      depth: 0,
      radius: 14,
      fill: ui.cardInner,
      border: withAlpha(ui.shadow, 0.1),
      borderWidth: 1,
      shadow: withAlpha(ui.shadow, 0.08),
      shadowOffsetY: 2,
      shadowRadius: 4,
    },
    banner: {
      depth: 0,
      radius: 16,
      fill: ui.card,
      border: withAlpha(ui.sky, 0.35),
      borderWidth: 1.5,
      shadow: withAlpha(ui.shadow, 0.15),
      shadowOffsetY: 3,
      shadowRadius: 6,
    },
    score: {
      depth: 0,
      radius: 20,
      fill: ui.card,
      border: withAlpha(ui.shadow, 0.12),
      borderWidth: 1,
      shadow: withAlpha(ui.shadow, 0.2),
      shadowOffsetY: 4,
      shadowRadius: 10,
      cardBg: ui.cardInner,
      cardBorder: withAlpha(ui.shadow, 0.12),
      cardActiveRing: withAlpha(ui.sky, 0.2),
      claimedBg: withAlpha(ui.skySoft, 0.45),
      claimedBorder: withAlpha(ui.sky, 0.25),
      claimedText: ui.chocolateSoft,
      versusBg: ui.sky,
      versusBorder: withAlpha(ui.navy, 0.15),
    },
    turn: {
      depth: 0,
      radius: 16,
      fill: ui.card,
      border: withAlpha(ui.peachDeep, 0.35),
      borderWidth: 1.5,
      shadow: withAlpha(ui.shadow, 0.15),
      shadowOffsetY: 3,
      shadowRadius: 6,
    },
    /** @deprecated alias — use stat */
    chip: {
      depth: 0,
      radius: 14,
      fill: ui.cardInner,
      border: withAlpha(ui.shadow, 0.1),
      borderWidth: 1,
      shadow: withAlpha(ui.shadow, 0.08),
      shadowOffsetY: 2,
      shadowRadius: 4,
    },
  },

  controls: {
    bg: ui.peach,
    border: withAlpha(ui.peachDeep, 0.5),
    text: ui.chocolate,
    primaryBg: ui.sky,
    primaryText: ui.navy,
  },

  board: {
    bg: land.grassLight,
    frame: withAlpha(ui.chocolateSoft, 0.25),
    frameDark: withAlpha(ui.shadow, 0.15),
    frameHighlight: withAlpha(palette.white, 0.4),
    innerBorder: withAlpha(ui.shadow, 0.12),
    shadow: withAlpha(ui.shadow, 0.15),
  },

  chip: {
    bg: ui.cardInner,
    border: withAlpha(ui.shadow, 0.12),
    emptyOpacity: 0.45,
  },

  accent: ui.gold,
  accentSoft: ui.peach,
} as const;

export type GamePanelVariant = keyof typeof GAME_SCENE.panels;
