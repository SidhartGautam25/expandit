import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { COLORS } from "../../constants/theme";
import { LEVEL_REGISTRY } from "../../constants/levels";

interface LevelSelectorProps {
  currentLevel: number;
  onSelectLevel: (level: number) => void;
  disabled: boolean;
}

export function LevelSelector({ currentLevel, onSelectLevel, disabled }: LevelSelectorProps) {
  const levels = [1, 2, 3, 4, 5];
  const selectedConfig = LEVEL_REGISTRY[currentLevel];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELECT BOT DIFFICULTY</Text>
      
      {/* Pills row */}
      <View style={styles.row}>
        {levels.map((lvl) => {
          const isSelected = lvl === currentLevel;
          const config = LEVEL_REGISTRY[lvl];
          
          return (
            <Pressable
              key={lvl}
              style={[
                styles.pill,
                isSelected && styles.pillSelected,
                disabled && styles.pillDisabled,
              ]}
              onPress={() => !disabled && onSelectLevel(lvl)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected && styles.pillTextSelected,
                ]}
              >
                {lvl}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Selected level explanation */}
      {selectedConfig && (
        <View style={styles.descBox}>
          <Text style={styles.levelName}>{selectedConfig.name}</Text>
          <Text style={styles.levelDesc}>{selectedConfig.description}</Text>
          <Text style={styles.levelDetail}>
            Depth: {selectedConfig.searchDepth} moves | Blunder Rate:{" "}
            {Math.round(selectedConfig.blunderRate * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 320,
    marginBottom: 10,
  },
  pill: {
    width: 48,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pillSelected: {
    backgroundColor: COLORS.player2,
    borderColor: COLORS.player2,
  },
  pillDisabled: {
    opacity: 0.5,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  pillTextSelected: {
    color: COLORS.text,
  },
  descBox: {
    width: "100%",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  levelName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.accentGold,
    marginBottom: 2,
  },
  levelDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 14,
    marginBottom: 4,
  },
  levelDetail: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
});
