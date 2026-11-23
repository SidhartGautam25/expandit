import { Platform } from "react-native";
import { GAME_SCENE } from "./scene";

/** System rounded-ish stack — swap for Nunito when @expo-google-fonts/nunito is installed */
export const GAME_FONT = {
  family: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "System",
  }),
} as const;

const t = GAME_SCENE.text;

/**
 * Rounded game typography for the board screen UI.
 */
export const GAME_TYPOGRAPHY = {
  title: {
    fontFamily: GAME_FONT.family,
    fontWeight: "800" as const,
    fontSize: 15,
    color: t.title,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: GAME_FONT.family,
    fontWeight: "600" as const,
    fontSize: 11,
    color: t.label,
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: GAME_FONT.family,
    fontWeight: "600" as const,
    fontSize: 10,
    color: t.label,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  value: {
    fontFamily: GAME_FONT.family,
    fontWeight: "900" as const,
    fontSize: 20,
    color: t.value,
    letterSpacing: 0.2,
  },
  valueSm: {
    fontFamily: GAME_FONT.family,
    fontWeight: "800" as const,
    fontSize: 15,
    color: t.value,
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: GAME_FONT.family,
    fontWeight: "700" as const,
    fontSize: 13,
    color: t.primary,
    letterSpacing: 0.1,
  },
  bodyMuted: {
    fontFamily: GAME_FONT.family,
    fontWeight: "600" as const,
    fontSize: 11,
    color: t.muted,
    letterSpacing: 0.1,
  },
  score: {
    fontFamily: GAME_FONT.family,
    fontWeight: "900" as const,
    fontSize: 28,
    color: t.value,
    lineHeight: 32,
  },
  pill: {
    fontFamily: GAME_FONT.family,
    fontWeight: "700" as const,
    fontSize: 9,
    color: t.label,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: GAME_FONT.family,
    fontWeight: "800" as const,
    fontSize: 12,
    color: t.primary,
    letterSpacing: 0.6,
  },
} as const;
