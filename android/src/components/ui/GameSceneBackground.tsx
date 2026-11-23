import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GAME_SCENE } from "../../constants/theme";

interface GameSceneBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Soft peach-beige screen background with a whisper of sky at the top */
export function GameSceneBackground({ children, style }: GameSceneBackgroundProps) {
  return (
    <LinearGradient
      colors={[...GAME_SCENE.backgroundGradient]}
      locations={[...GAME_SCENE.backgroundLocations]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
