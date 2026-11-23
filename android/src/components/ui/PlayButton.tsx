import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const BUTTON_WIDTH = 255;
const BUTTON_HEIGHT = 82;
const CORNER_RADIUS = 30;

const PLAYFUL_FONT_BOLD = Platform.select({
  ios: "Fredoka_700Bold",
  android: "Fredoka_700Bold",
  web: "'Fredoka', 'Fredoka_700Bold', 'sans-serif-rounded', sans-serif",
  default: "Fredoka_700Bold",
});

const PLAYFUL_FONT_SEMIBOLD = Platform.select({
  ios: "Fredoka_600SemiBold",
  android: "Fredoka_600SemiBold",
  web: "'Fredoka', 'Fredoka_600SemiBold', 'sans-serif-rounded', sans-serif",
  default: "Fredoka_600SemiBold",
});

interface PlayButtonProps {
  levelNumber: number;
  subtitle?: string;
  onPress: () => void;
}

export function PlayButton({ levelNumber, subtitle, onPress }: PlayButtonProps) {
  const [pressed, setPressed] = useState(false);

  const formattedSubtitle = subtitle
    ? subtitle.includes("✦") ? subtitle : `✦ ${subtitle} ✦`
    : `✦ Level ${levelNumber} ✦`;

  return (
    <View style={styles.wrapper}>
      {/* 3D Bottom Shadow Lip */}
      <View style={styles.shadowBase} />

      {/* Button Face with White Border & Tactile Press Feedback */}
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={({ pressed: isPressed }) => [
          styles.face,
          {
            transform: [{ scale: isPressed || pressed ? 0.96 : 1 }],
            opacity: isPressed || pressed ? 0.93 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={["#A6F238", "#7ED61D", "#4EA808"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          {/* Top Gloss Highlights */}
          <View style={styles.topShine} />
          <View style={styles.glossPill} />

          <View style={styles.labelColumn}>
            <Text style={styles.playText}>PLAY!</Text>
            <Text style={styles.levelSubtitle}>{formattedSubtitle}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT + 4,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  shadowBase: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: BUTTON_HEIGHT,
    borderRadius: CORNER_RADIUS,
    backgroundColor: "#357904",
  },
  face: {
    width: "100%",
    height: BUTTON_HEIGHT,
    borderRadius: CORNER_RADIUS,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: CORNER_RADIUS,
    borderWidth: 4.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  topShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderTopLeftRadius: CORNER_RADIUS,
    borderTopRightRadius: CORNER_RADIUS,
  },
  glossPill: {
    position: "absolute",
    top: 6,
    left: 20,
    width: 36,
    height: 14,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    transform: [{ rotate: "-15deg" }],
  },
  labelColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    paddingTop: 2,
  },
  playText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 38,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: "rgba(35, 80, 5, 0.45)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  levelSubtitle: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textAlign: "center",
    textShadowColor: "rgba(35, 80, 5, 0.35)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 0,
    marginTop: -2,
  },
});
