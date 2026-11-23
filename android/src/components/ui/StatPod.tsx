import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { GamifiedPanel } from "./GamifiedPanel";
import { GameText } from "./GameText";

interface StatPodProps {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}

/** Small rounded stat pod — Onet-style level / time / streak chip */
export function StatPod({ label, value, style }: StatPodProps) {
  return (
    <GamifiedPanel variant="stat" style={[styles.podWrap, style]} contentStyle={styles.pod}>
      <GameText variant="label">{label}</GameText>
      <GameText variant="valueSm" style={styles.value}>
        {value}
      </GameText>
    </GamifiedPanel>
  );
}

const styles = StyleSheet.create({
  podWrap: {
    flex: 1,
  },
  pod: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  value: {
    marginTop: 2,
  },
});
