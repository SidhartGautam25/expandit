import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { GAME_SCENE, GamePanelVariant } from "../../constants/theme";

type SolidPanelConfig = {
  depth: number;
  radius: number;
  fill: string;
  border: string;
  borderWidth: number;
  shadow: string;
  shadowOffsetY: number;
  shadowRadius: number;
};

interface GamifiedPanelProps {
  variant: GamePanelVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

function getPanelConfig(variant: GamePanelVariant): SolidPanelConfig {
  const p = GAME_SCENE.panels[variant];
  if ("fill" in p) {
    return p as SolidPanelConfig;
  }
  return GAME_SCENE.panels.stat as SolidPanelConfig;
}

/** Pillow-soft card panel for board-screen UI */
export function GamifiedPanel({ variant, children, style, contentStyle }: GamifiedPanelProps) {
  const panel = getPanelConfig(variant);

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.card,
          {
            borderRadius: panel.radius,
            backgroundColor: panel.fill,
            borderColor: panel.border,
            borderWidth: panel.borderWidth,
            shadowColor: panel.shadow,
            shadowOffset: { width: 0, height: panel.shadowOffsetY },
            shadowOpacity: 1,
            shadowRadius: panel.shadowRadius,
            elevation: 4,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  card: {
    overflow: "hidden",
  },
});
