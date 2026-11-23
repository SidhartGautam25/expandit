import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const BUTTON_SIZE = 58;
const BUTTON_DEPTH = 5;

export type CircleButtonVariant = "blue" | "purple";

interface CircleActionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: CircleButtonVariant;
  style?: ViewStyle;
}

const PRESETS = {
  blue: {
    colors: ["#54A6FF", "#1C78E6", "#0D52AB"] as const,
    shadow: "#093978",
  },
  purple: {
    colors: ["#C56EFF", "#9B33EB", "#6E15B5"] as const,
    shadow: "#4D0C82",
  },
};

export function CircleActionButton({
  onPress,
  children,
  variant = "blue",
  style,
}: CircleActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  const preset = PRESETS[variant];

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.shadowBase, { backgroundColor: preset.shadow }]} />
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={({ pressed: isPressed }) => [
          styles.face,
          {
            transform: [{ scale: isPressed || pressed ? 0.92 : 1 }],
            opacity: isPressed || pressed ? 0.9 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.topShine} />
          <View style={styles.iconWrap}>{children}</View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export function GearIcon() {
  return <Text style={styles.gearIcon}>⚙</Text>;
}

export function MenuIcon() {
  return (
    <View style={styles.menuIcon}>
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
      <View style={styles.menuLine} />
    </View>
  );
}

export function StatsIcon() {
  return <MenuIcon />;
}

const styles = StyleSheet.create({
  wrapper: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE + 3,
    alignItems: "center",
  },
  shadowBase: {
    position: "absolute",
    bottom: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
  },
  face: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  topShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderTopLeftRadius: BUTTON_SIZE / 2,
    borderTopRightRadius: BUTTON_SIZE / 2,
  },
  iconWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  gearIcon: {
    fontSize: 26,
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    marginTop: -1,
  },
  menuIcon: {
    width: 20,
    gap: 3.5,
    alignItems: "center",
  },
  menuLine: {
    width: 20,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 0,
    shadowOpacity: 1,
  },
});
