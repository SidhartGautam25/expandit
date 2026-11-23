import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";
import { GAME_TYPOGRAPHY } from "../../constants/theme";

type GameTextVariant = keyof typeof GAME_TYPOGRAPHY;

interface GameTextProps {
  variant: GameTextVariant;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function GameText({ variant, children, style, numberOfLines }: GameTextProps) {
  return (
    <Text style={[GAME_TYPOGRAPHY[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
