/**
 * Raw color values — change these to retheme the entire app.
 * Do not use palette directly in UI components; use COLORS / GAME_UI tokens instead.
 */
export const palette = {
  white: "#FFFFFF",
  black: "#000000",
  cream: "#F4F1EA",

  /** Shared world palette — sky, meadow, wood panels (home + game screens) */
  world: {
    skyTop: "#6EC6F5",
    skyMid: "#A8DDF8",
    skyBottom: "#D4F0FF",
    meadow: "#B8E89A",
    meadowLight: "#E2F5D4",
    grassLight: "#F0FAE8",
    wood: "#C4894A",
    woodDark: "#9A5E2E",
    woodLight: "#E8C99A",
    panel: "#FFFBF5",
    panelBorder: "#E8D4B8",
    accent: "#FF9F1A",
    accentSoft: "#FFB830",
    /** Onet-style board-screen UI — peach, cream, chocolate, navy, sky */
    ui: {
      screenTop: "#EAF6FC",
      screen: "#F5E9DC",
      screenBottom: "#EFE0D0",
      card: "#FFFAF4",
      cardInner: "#F8F1E8",
      chocolate: "#5C3D2E",
      chocolateSoft: "#8B6B5C",
      navy: "#1E3A5F",
      sky: "#7EC8E8",
      skySoft: "#B8E4F5",
      peach: "#F5D4B8",
      peachDeep: "#E8B896",
      gold: "#F5C542",
      shadow: "#C4A88A",
    },
    /** Land layer — crops, flowers, soil (bottom of scene gradient) */
    land: {
      grassLight: "#DCECC8",
      grass: "#CDDFB0",
      grassDeep: "#BFD4A4",
      crop: "#D4DEB8",
      meadowBlend: "#E4EDD6",
      flowerMeadow: "#DDD4C4",
      flowerPink: "#E8B4C0",
      flowerYellow: "#F0DCA8",
      flowerPurple: "#D8C0E0",
      soil: "#C4B09A",
      soilDeep: "#A89478",
    },
  },

  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#111827",
    950: "#030712",
  },

  blue: {
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E3A8A",
  },

  red: {
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#7F1D1D",
  },

  amber: {
    50: "#FFFBEB",
    100: "#FEF08A",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#78350F",
  },

  purple: {
    400: "#C084FC",
    800: "#581C87",
  },

  gray: {
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
  },

  green: {
    500: "#10B981",
  },

  /** Resource bar chip colors (treasure hunt) */
  resource: {
    money: "#10B981",
    gold: "#FBBF24",
    silver: "#94A3B8",
  },

  /** Home-screen 3D play button */
  playButton: {
    gradientTop: "#FFE566",
    gradientMid: "#FFB830",
    gradientBottom: "#FF8F00",
    shadow: "#C45A00",
    shadowDark: "#9A4200",
    textOutline: "#B84A00",
    gloss: "rgba(255, 255, 255, 0.55)",
    glossSoft: "rgba(255, 255, 255, 0.25)",
  },

  /** Home-screen circular icon buttons */
  circleButton: {
    gradientTop: "#E8A55A",
    gradientMid: "#D4893F",
    gradientBottom: "#B86A2E",
    shadow: "#8B4E1F",
    shadowDark: "#6B3A14",
    border: "rgba(255, 255, 255, 0.28)",
  },

  /** Neutral plot hues for the game board — vibrant, bright soft tones (rich but smooth) */
  plot: [
    "#C28BE0",
    "#98D75A",
    "#64A5E8",
    "#EAC148",
    "#54C586",
    "#E87098",
    "#3DBFB8",
    "#F2954B",
    "#A87BE3",
    "#78C956",
    "#4DA9E8",
    "#E6B836",
    "#D47AD8",
    "#6BCB8B",
    "#52B5E8",
    "#F5A65B",
  ],
} as const;
