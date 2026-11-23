import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { PlayerPowers, PowerId } from "../../types/powers";
import { getAllPowers } from "../../registries/powerRegistry";
import { COLORS, GAME_SCENE } from "../../constants/theme";
import { GameText } from "./GameText";

interface PowerBarProps {
  powers: PlayerPowers;
  selectedPower: PowerId | null;
  targetingMode: boolean;
  onActivatePower: (powerId: PowerId) => void;
  onCancelTargeting: () => void;
  disabled: boolean;
  alwaysShowHint?: boolean;
}

export function PowerBar({
  powers,
  selectedPower,
  targetingMode,
  onActivatePower,
  onCancelTargeting,
  disabled,
  alwaysShowHint = false,
}: PowerBarProps) {
  const availablePowers = getAllPowers().filter(
    (p) => (powers[p.id as PowerId] ?? 0) > 0
  );
  const hasPowers = availablePowers.length > 0;

  if (!hasPowers && !alwaysShowHint) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <GameText variant="label">Powers</GameText>
        {targetingMode && (
          <Pressable onPress={onCancelTargeting} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>✕ Cancel</Text>
          </Pressable>
        )}
      </View>

      {hasPowers ? (
        <View style={styles.row}>
          {availablePowers.map((power) => {
            const qty = powers[power.id as PowerId];
            const isSelected = selectedPower === power.id;
            return (
              <Pressable
                key={power.id}
                style={[
                  styles.powerBtn,
                  isSelected && styles.powerBtnSelected,
                  disabled && styles.powerBtnDisabled,
                ]}
                onPress={() => !disabled && onActivatePower(power.id)}
                disabled={disabled}
              >
                <Text style={styles.powerIcon}>{power.icon}</Text>
                <Text style={styles.powerName}>{power.name}</Text>
                <Text style={styles.powerQty}>×{qty}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.hintText}>
          Capture boxes with ⚡🔄💥❄️ icons to unlock powers!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    gap: 12,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    color: GAME_SCENE.text.muted,
    letterSpacing: 1.5,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.player2BgMedium,
  },
  cancelText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.player2Light,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  powerBtn: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GAME_SCENE.chip.border,
    backgroundColor: GAME_SCENE.chip.bg,
    minWidth: 68,
    shadowColor: GAME_SCENE.panel.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  powerBtnSelected: {
    borderColor: GAME_SCENE.accent,
    backgroundColor: COLORS.goldBgSubtle,
  },
  powerBtnDisabled: {
    opacity: 0.4,
  },
  powerIcon: {
    fontSize: 16,
  },
  powerName: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  powerQty: {
    fontSize: 10,
    fontWeight: "700",
    color: GAME_SCENE.accent,
    marginTop: 1,
  },
  hintText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 14,
  },
});
