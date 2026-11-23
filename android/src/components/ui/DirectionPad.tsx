import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Direction } from "../../types/box";
import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { canExpandBlock, getExtrusionStripCells } from "../../engine/board/blockEngine";
import { COLORS } from "../../constants/theme";

interface DirectionPadProps {
  board: GameBoard | null;
  activePlayer: Player;
  selectedBoxId: string | null;
  selectedDirection: Direction | null;
  onSelectDirection: (dir: Direction | null) => void;
  onExpandDirection: (boxId: string, dir: Direction) => void;
  onDeselect: () => void;
  disabled?: boolean;
}

export function DirectionPad({
  board,
  activePlayer,
  selectedBoxId,
  selectedDirection,
  onSelectDirection,
  onExpandDirection,
  onDeselect,
  disabled = false,
}: DirectionPadProps) {
  const selectedBox =
    board && selectedBoxId ? board.boxes[selectedBoxId] : null;

  const getDirectionStatus = (dir: Direction) => {
    if (!board || !selectedBox) {
      return {
        isValid: false,
        gain: 0,
        isActivePreselect: selectedDirection === dir,
      };
    }
    const isValid = canExpandBlock(board, selectedBox.id, dir, activePlayer);
    const strip = getExtrusionStripCells(selectedBox, dir);
    return {
      isValid,
      gain: strip.length,
      isActivePreselect: selectedDirection === dir,
    };
  };

  const handlePressDirection = (dir: Direction) => {
    if (disabled) return;

    if (selectedBox) {
      // Block is selected: trigger expansion in this direction
      const status = getDirectionStatus(dir);
      if (status.isValid) {
        onExpandDirection(selectedBox.id, dir);
      }
    } else {
      // No block selected: toggle pre-selection of direction
      if (selectedDirection === dir) {
        onSelectDirection(null);
      } else {
        onSelectDirection(dir);
      }
    }
  };

  const renderDirBtn = (dir: Direction, icon: string, label: string) => {
    const status = getDirectionStatus(dir);
    const isSelectedMode = Boolean(selectedBox);
    const canClick = isSelectedMode ? status.isValid : true;
    const isHighlighted = isSelectedMode ? status.isValid : status.isActivePreselect;

    return (
      <Pressable
        onPress={() => handlePressDirection(dir)}
        disabled={disabled || (isSelectedMode && !status.isValid)}
        style={({ pressed }) => [
          styles.dirBtn,
          isHighlighted && styles.dirBtnActive,
          isSelectedMode && !status.isValid && styles.dirBtnBlocked,
          pressed && canClick && styles.dirBtnPressed,
        ]}
      >
        <Text style={[styles.dirIcon, isHighlighted && styles.dirIconActive]}>
          {icon}
        </Text>
        <Text style={[styles.dirLabel, isHighlighted && styles.dirLabelActive]}>
          {isSelectedMode && status.isValid ? `+${status.gain}` : label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          {selectedBox
            ? `Extrude Block (${selectedBox.width}×${selectedBox.height})`
            : selectedDirection
            ? `Direction ${selectedDirection.toUpperCase()} selected (tap block)`
            : "Tap empty cell to spawn, or select block to extrude"}
        </Text>
        {(selectedBox || selectedDirection) && (
          <Pressable onPress={onDeselect} style={styles.deselectBtn}>
            <Text style={styles.deselectBtnText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.dpadGrid}>
        <View style={styles.rowCenter}>{renderDirBtn("up", "▲", "UP")}</View>
        <View style={styles.rowMiddle}>
          {renderDirBtn("left", "◄", "LEFT")}
          <View style={styles.centerBadge}>
            <Text style={styles.centerBadgeText}>
              {selectedBox ? `${selectedBox.size}⬚` : "DIR"}
            </Text>
          </View>
          {renderDirBtn("right", "►", "RIGHT")}
        </View>
        <View style={styles.rowCenter}>{renderDirBtn("down", "▼", "DOWN")}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  headerText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontFamily: "Fredoka_600SemiBold",
    flex: 1,
  },
  deselectBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  deselectBtnText: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
  },
  dpadGrid: {
    alignItems: "center",
    gap: 4,
  },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
  },
  rowMiddle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dirBtn: {
    width: 62,
    height: 38,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dirBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#93C5FD",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.6,
  },
  dirBtnBlocked: {
    opacity: 0.3,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  dirBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  dirIcon: {
    color: "#94A3B8",
    fontSize: 12,
  },
  dirIconActive: {
    color: "#FFFFFF",
  },
  dirLabel: {
    color: "#CBD5E1",
    fontSize: 9,
    fontFamily: "Fredoka_700Bold",
  },
  dirLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  centerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  centerBadgeText: {
    color: "#FACC15",
    fontSize: 10,
    fontFamily: "Fredoka_700Bold",
  },
});
