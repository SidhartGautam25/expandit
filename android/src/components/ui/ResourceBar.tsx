import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlayerResources } from "../../types/resources";
import { RESOURCE_META } from "../../registries/resourceRegistry";
import { ResourceType } from "../../types/resources";
import { COLORS, GAME_SCENE } from "../../constants/theme";
import { GameText } from "./GameText";

interface ResourceBarProps {
  resources: PlayerResources;
  label?: string;
  alwaysShow?: boolean;
}

const RESOURCE_ORDER: ResourceType[] = ["money", "gold", "silver"];

export function ResourceBar({
  resources,
  label = "RESOURCES",
  alwaysShow = false,
}: ResourceBarProps) {
  const hasAny = RESOURCE_ORDER.some((r) => (resources[r] ?? 0) > 0);
  if (!alwaysShow && !hasAny) return null;

  return (
    <View style={styles.container}>
      <GameText variant="label">{label}</GameText>
      <View style={styles.row}>
        {RESOURCE_ORDER.map((type) => {
          const amount = resources[type] ?? 0;
          const meta = RESOURCE_META[type];
          return (
            <View
              key={type}
              style={[
                styles.chip,
                { borderColor: meta.color },
                amount === 0 && styles.chipEmpty,
              ]}
            >
              <Text style={[styles.chipText, amount === 0 && styles.chipTextEmpty]}>
                {meta.icon} {amount}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    color: GAME_SCENE.text.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: GAME_SCENE.chip.bg,
    minWidth: 56,
    alignItems: "center",
    shadowColor: GAME_SCENE.panel.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chipEmpty: {
    opacity: GAME_SCENE.chip.emptyOpacity,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  chipTextEmpty: {
    color: COLORS.textMuted,
  },
});
