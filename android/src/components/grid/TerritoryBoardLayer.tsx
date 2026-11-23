import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { GameBoard } from "../../types/board";
import { GameBox, Direction, Coord } from "../../types/box";
import { Player } from "../../types/game";
import { BoardMetrics } from "../../engine/board/boardLayout";
import { getRowTerritoryZone, getMidlineRow } from "../../engine/board/territoryRules";
import { canExpandBlock, getExtrusionStripCells } from "../../engine/board/blockEngine";

interface TerritoryBoardLayerProps {
  board: GameBoard;
  metrics: BoardMetrics;
  activePlayer: Player;
  selectedBoxId: string | null;
  onSelectBox: (boxId: string | null) => void;
  onExpandDirection?: (boxId: string, dir: Direction) => void;
  player1ColorHex?: string;
  player2ColorHex?: string;
  disabled?: boolean;
}

export function TerritoryBoardLayer({
  board,
  metrics,
  activePlayer,
  selectedBoxId,
  onSelectBox,
  onExpandDirection,
  player1ColorHex = "#2563EB",
  player2ColorHex = "#EA580C",
  disabled = false,
}: TerritoryBoardLayerProps) {
  const { rows, cols } = board;
  const { cellSize, gridGap, boardPadding } = metrics;
  const midline = getMidlineRow(rows);

  const getCellLayout = (r: number, c: number) => ({
    left: boardPadding + c * (cellSize + gridGap),
    top: boardPadding + r * (cellSize + gridGap),
    width: cellSize,
    height: cellSize,
  });

  const getBlockLayout = (box: GameBox) => ({
    left: boardPadding + box.col * (cellSize + gridGap),
    top: boardPadding + box.row * (cellSize + gridGap),
    width: box.width * cellSize + (box.width - 1) * gridGap,
    height: box.height * cellSize + (box.height - 1) * gridGap,
  });

  const selectedBox = selectedBoxId ? board.boxes[selectedBoxId] : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Background Grid Cells (Territory Tints & Neutral White Zone) */}
      {Array.from({ length: rows }).map((_, r) => {
        const zone = getRowTerritoryZone(board, r);
        return Array.from({ length: cols }).map((_, c) => {
          const layout = getCellLayout(r, c);
          const isMidlineBorder = r === midline - 1;

          let cellBg = "#EFF6FF"; // Player 1 light tint
          let cellBorder = "rgba(59, 130, 246, 0.25)";

          if (zone === "neutral") {
            cellBg = "#FFFFFF"; // Crisp Neutral White
            cellBorder = "#CBD5E1";
          } else if (zone === "player2") {
            cellBg = "#FFF7ED"; // Player 2 light tint
            cellBorder = "rgba(234, 88, 12, 0.25)";
          }

          return (
            <View
              key={`bg-cell-${r}-${c}`}
              style={[
                styles.gridCell,
                {
                  left: layout.left,
                  top: layout.top,
                  width: layout.width,
                  height: layout.height,
                  backgroundColor: cellBg,
                  borderColor: cellBorder,
                },
                isMidlineBorder && styles.midlineCellBottom,
              ]}
            >
              {/* Subtle spawn affordance dot for the active player's territory or neutral zone */}
              {board.cellMap[r][c] === null && !disabled && (
                <View
                  style={[
                    styles.spawnDot,
                    {
                      backgroundColor:
                        zone === "neutral"
                          ? "rgba(100, 116, 139, 0.2)"
                          : activePlayer === 1 && zone === "player1"
                          ? "rgba(37, 99, 235, 0.3)"
                          : activePlayer === 2 && zone === "player2"
                          ? "rgba(234, 88, 12, 0.3)"
                          : "transparent",
                    },
                  ]}
                />
              )}
            </View>
          );
        });
      })}

      {/* 2. Solid Claimed Rectangular Blocks */}
      {Object.values(board.boxes).map((box) => {
        const blockLayout = getBlockLayout(box);
        const isP1 = box.owner === 1;
        const isSelected = selectedBoxId === box.id;
        const vibrantColor = isP1 ? player1ColorHex : player2ColorHex;
        const strokeColor = isP1 ? "#1D4ED8" : "#C2410C";

        return (
          <View
            key={`block-${box.id}`}
            style={[
              styles.blockContainer,
              {
                left: blockLayout.left,
                top: blockLayout.top,
                width: blockLayout.width,
                height: blockLayout.height,
                backgroundColor: vibrantColor,
                borderColor: isSelected ? "#FACC15" : strokeColor,
                borderWidth: isSelected ? 3 : 2,
                shadowColor: isSelected ? "#FACC15" : "#000",
                shadowOpacity: isSelected ? 0.75 : 0.25,
                shadowRadius: isSelected ? 8 : 4,
                elevation: isSelected ? 8 : 3,
                zIndex: isSelected ? 30 : 20,
              },
            ]}
            pointerEvents="box-none"
          >
            {/* Subtle inner grid segmentation lines showing rectangle dimensions */}
            {box.height > 1 &&
              Array.from({ length: box.height - 1 }).map((_, idx) => (
                <View
                  key={`h-seg-${idx}`}
                  style={[
                    styles.segLineH,
                    {
                      top: (idx + 1) * (cellSize + gridGap) - gridGap / 2,
                    },
                  ]}
                />
              ))}
            {box.width > 1 &&
              Array.from({ length: box.width - 1 }).map((_, idx) => (
                <View
                  key={`v-seg-${idx}`}
                  style={[
                    styles.segLineV,
                    {
                      left: (idx + 1) * (cellSize + gridGap) - gridGap / 2,
                    },
                  ]}
                />
              ))}

            {/* Block Dimension & Size Badge in Center */}
            <View style={styles.blockBadgeWrap} pointerEvents="none">
              <View
                style={[
                  styles.blockBadge,
                  isSelected && styles.blockBadgeSelected,
                ]}
              >
                <Text style={styles.blockBadgeText}>
                  {box.width}×{box.height}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 3. Floating Directional Extrusion Arrows on Selected Block */}
      {selectedBox && !disabled && selectedBox.owner === activePlayer && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {(["up", "down", "left", "right"] as Direction[]).map((dir) => {
            const isValid = canExpandBlock(board, selectedBox.id, dir, activePlayer);
            if (!isValid) return null; // Only show valid arrows

            const strip = getExtrusionStripCells(selectedBox, dir);
            const blockLayout = getBlockLayout(selectedBox);
            const btnSize = 34;

            let arrowLeft = blockLayout.left + blockLayout.width / 2 - btnSize / 2;
            let arrowTop = blockLayout.top + blockLayout.height / 2 - btnSize / 2;
            let arrowIcon = "▲";

            switch (dir) {
              case "up":
                arrowTop = blockLayout.top - btnSize - 4;
                arrowIcon = "▲";
                break;
              case "down":
                arrowTop = blockLayout.top + blockLayout.height + 4;
                arrowIcon = "▼";
                break;
              case "left":
                arrowLeft = blockLayout.left - btnSize - 4;
                arrowIcon = "◄";
                break;
              case "right":
                arrowLeft = blockLayout.left + blockLayout.width + 4;
                arrowIcon = "►";
                break;
            }

            return (
              <Pressable
                key={`arrow-${dir}`}
                onPress={() => onExpandDirection?.(selectedBox.id, dir)}
                style={({ pressed }) => [
                  styles.arrowButton,
                  {
                    left: arrowLeft,
                    top: arrowTop,
                    width: btnSize,
                    height: btnSize,
                    borderRadius: btnSize / 2,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  },
                ]}
                hitSlop={8}
              >
                <Text style={styles.arrowIcon}>{arrowIcon}</Text>
                <Text style={styles.arrowGain}>+{strip.length}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gridCell: {
    position: "absolute",
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  midlineCellBottom: {
    borderBottomWidth: 2,
    borderBottomColor: "rgba(234, 179, 8, 0.6)",
  },
  spawnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  blockContainer: {
    position: "absolute",
    borderRadius: 7,
    overflow: "visible",
    justifyContent: "center",
    alignItems: "center",
  },
  segLineH: {
    position: "absolute",
    left: 2,
    right: 2,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  segLineV: {
    position: "absolute",
    top: 2,
    bottom: 2,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  blockBadgeWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  blockBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  blockBadgeSelected: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderColor: "#FACC15",
  },
  blockBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  arrowButton: {
    position: "absolute",
    backgroundColor: "#FACC15",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 12,
    zIndex: 99,
  },
  arrowIcon: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 12,
  },
  arrowGain: {
    color: "#0F172A",
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 9,
  },
});
