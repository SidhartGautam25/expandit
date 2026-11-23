import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GameBoard } from "../types/board";
import { GameBox, Coord } from "../types/box";
import { Player } from "../types/game";
import {
  getBoxFillColor,
  getCapturedCountTextColor,
  getCapturedStrokeColor,
  lightenColor,
} from "../engine/board/boxColors";
import { COLORS, PLAYER_CAPTURE_COLORS } from "../constants/theme";
import {
  BoardMetrics,
  getCellFillLayout,
  getCellCornerRadius,
  getCellStrokeLayout,
  getBoxUnionBounds,
  getBoxUnionCornerRadius,
  PLOT_STROKE_WIDTH,
  CellLayout,
} from "../engine/board/boardLayout";

const AnimatedView = Animated.createAnimatedComponent(View);

interface TutorialBoxShapeLayerProps {
  board: GameBoard;
  metrics: BoardMetrics;
  lastBotBoxIds: Set<string>;
  targetCoord?: Coord | null;
  player1ColorHex?: string;
  player2ColorHex?: string;
}

function isLightCaptureColor(color: string): boolean {
  const h = color.trim().toLowerCase().replace("#", "");
  return h === "ffffff" || h === "fff";
}

function getCircledCountLayout(cell: CellLayout, metrics: BoardMetrics) {
  const pad = Math.max(6, metrics.cellSize * 0.14);
  const innerW = Math.max(0, cell.width - pad * 2);
  const innerH = Math.max(0, cell.height - pad * 2);
  const inner = Math.min(innerW, innerH);
  const diameter = Math.max(14, Math.min(inner * 0.82, metrics.cellSize * 0.75, inner));
  return {
    left: cell.left + (cell.width - diameter) / 2,
    top: cell.top + (cell.height - diameter) / 2,
    diameter,
    fontSize: Math.max(10, diameter * 0.4),
    borderWidth: Math.max(2, diameter * 0.07),
  };
}

function getLabelCellLayout(
  board: GameBoard,
  box: GameBox,
  metrics: BoardMetrics
): CellLayout {
  let best = getCellFillLayout(board, box, box.anchor, metrics);
  let bestArea = best.width * best.height;

  for (const cell of box.cells) {
    const fill = getCellFillLayout(board, box, cell, metrics);
    const area = fill.width * fill.height;
    if (area > bestArea) {
      bestArea = area;
      best = fill;
    }
  }

  return best;
}

function CircledCount({
  count,
  fillColor,
  layout,
}: {
  count: number;
  fillColor: string;
  layout: ReturnType<typeof getCircledCountLayout>;
}) {
  const light = isLightCaptureColor(fillColor);
  const ringColor = light ? "#1e293b" : "#ffffff";
  const textColor = light ? "#1e293b" : "#ffffff";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: layout.left,
        top: layout.top,
        width: layout.diameter,
        height: layout.diameter,
        borderRadius: layout.diameter / 2,
        borderWidth: layout.borderWidth,
        borderColor: ringColor,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
      }}
    >
      <Text
        style={{
          fontSize: layout.fontSize,
          fontWeight: "900",
          color: textColor,
          textAlign: "center",
          includeFontPadding: false,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {count > 0 ? count : ""}
      </Text>
    </View>
  );
}

function TutorialTargetHighlight({
  coord,
  board,
  metrics,
}: {
  coord: Coord;
  board: GameBoard;
  metrics: BoardMetrics;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 550 }),
        withTiming(0.92, { duration: 550 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  let targetBox: GameBox | null = null;
  for (const box of Object.values(board.boxes)) {
    if (box.cells.some((cell) => cell.row === coord.row && cell.col === coord.col)) {
      targetBox = box;
      break;
    }
  }

  if (!targetBox) return null;

  const strokeWidth = 3.5;
  const targetCellLayout = getCellFillLayout(board, targetBox, coord, metrics);

  return (
    <>
      {/* Yellow Outer Border (Extends ONLY on external sides, zero internal lines!) */}
      {targetBox.cells.map((cell) => {
        const stroke = getCellStrokeLayout(board, targetBox, cell, metrics, strokeWidth);
        const corners = getCellCornerRadius(board, targetBox, cell, metrics);

        return (
          <AnimatedView
            key={`target-stroke-${cell.row}-${cell.col}`}
            pointerEvents="none"
            style={[
              animatedStyle,
              corners,
              {
                position: "absolute",
                left: stroke.left,
                top: stroke.top,
                width: stroke.width,
                height: stroke.height,
                backgroundColor: "#FFD700",
                zIndex: 98,
                shadowColor: "#FFD700",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 8,
                elevation: 10,
              },
            ]}
          />
        );
      })}

      {/* Yellow Inner Fill (Seamless overlay spanning plot cells) */}
      {targetBox.cells.map((cell) => {
        const fill = getCellFillLayout(board, targetBox, cell, metrics);
        const corners = getCellCornerRadius(board, targetBox, cell, metrics);

        return (
          <AnimatedView
            key={`target-fill-${cell.row}-${cell.col}`}
            pointerEvents="none"
            style={[
              animatedStyle,
              corners,
              {
                position: "absolute",
                left: fill.left,
                top: fill.top,
                width: fill.width,
                height: fill.height,
                backgroundColor: "rgba(255, 215, 0, 0.35)",
                zIndex: 99,
              },
            ]}
          />
        );
      })}

      {/* Finger Pointer */}
      <AnimatedView
        pointerEvents="none"
        style={[
          animatedStyle,
          {
            position: "absolute",
            left: targetCellLayout.left,
            top: targetCellLayout.top - 28,
            width: targetCellLayout.width,
            alignItems: "center",
            zIndex: 100,
          },
        ]}
      >
        <Text style={{ fontSize: 26 }}>👇</Text>
      </AnimatedView>
    </>
  );
}

function BoxShape({
  box,
  board,
  metrics,
  player1ColorHex = PLAYER_CAPTURE_COLORS.player1,
  player2ColorHex = PLAYER_CAPTURE_COLORS.player2,
}: {
  box: GameBox;
  board: GameBoard;
  metrics: BoardMetrics;
  player1ColorHex?: string;
  player2ColorHex?: string;
}) {
  const isCaptured = box.owner !== null && box.count >= box.captureThreshold;
  const showFreezeVisual = box.frozenBy !== null && !isCaptured;
  const getPlayerColor = (p: Player) => (p === 1 ? player1ColorHex : player2ColorHex);
  const freezerColor =
    box.frozenBy !== null ? getPlayerColor(box.frozenBy) : null;
  const playerColor =
    box.owner !== null ? getPlayerColor(box.owner) : box.baseColor;

  const fillColor = getBoxFillColor(
    box.baseColor,
    box.count,
    box.captureThreshold,
    isCaptured,
    playerColor
  );
  const frozenFillColor = freezerColor ?? fillColor;

  const strokeWidth = PLOT_STROKE_WIDTH;
  const strokeColor = isCaptured
    ? getCapturedStrokeColor(playerColor)
    : lightenColor(box.baseColor, 0.42);
  const countTextColor = isCaptured
    ? getCapturedCountTextColor(playerColor)
    : COLORS.text;

  const union = getBoxUnionBounds(board, box, metrics);
  const unionCorners = getBoxUnionCornerRadius(board, box, metrics);
  const circledCountLayout = showFreezeVisual
    ? getCircledCountLayout(getLabelCellLayout(board, box, metrics), metrics)
    : null;

  return (
    <>
      {!showFreezeVisual ? (
        box.cells.map((cell) => {
          const stroke = getCellStrokeLayout(board, box, cell, metrics, strokeWidth);
          const corners = getCellCornerRadius(board, box, cell, metrics);
          const fill = getCellFillLayout(board, box, cell, metrics);

          return (
            <React.Fragment key={`fill-${box.id}-${cell.row}-${cell.col}`}>
              <View
                pointerEvents="none"
                style={[
                  styles.fillCell,
                  corners,
                  {
                    left: stroke.left,
                    top: stroke.top,
                    width: stroke.width,
                    height: stroke.height,
                    backgroundColor: strokeColor,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.fillCell,
                  corners,
                  {
                    left: fill.left,
                    top: fill.top,
                    width: fill.width,
                    height: fill.height,
                    backgroundColor: fillColor,
                  },
                ]}
              />
            </React.Fragment>
          );
        })
      ) : (
        <>
          {box.cells.map((cell) => {
            const stroke = getCellStrokeLayout(board, box, cell, metrics, strokeWidth);
            const corners = getCellCornerRadius(board, box, cell, metrics);
            return (
              <View
                key={`frozen-stroke-${box.id}-${cell.row}-${cell.col}`}
                pointerEvents="none"
                style={[
                  styles.fillCell,
                  corners,
                  {
                    left: stroke.left,
                    top: stroke.top,
                    width: stroke.width,
                    height: stroke.height,
                    backgroundColor: lightenColor(box.baseColor, 0.42),
                  },
                ]}
              />
            );
          })}
          <View
            pointerEvents="none"
            style={[
              styles.fillCell,
              unionCorners,
              {
                left: union.left,
                top: union.top,
                width: union.width,
                height: union.height,
                backgroundColor: frozenFillColor,
              },
            ]}
          />
        </>
      )}

      {box.count > 0 && !showFreezeVisual && (
        <View
          pointerEvents="none"
          style={[
            styles.anchorLabel,
            getCellFillLayout(board, box, box.anchor, metrics),
          ]}
        >
          <Text style={[styles.countText, { color: countTextColor }]}>
            {box.count}
          </Text>
        </View>
      )}

      {showFreezeVisual && circledCountLayout && freezerColor ? (
        <CircledCount
          count={box.count}
          fillColor={freezerColor}
          layout={circledCountLayout}
        />
      ) : null}
    </>
  );
}

export function TutorialBoxShapeLayer({
  board,
  metrics,
  targetCoord,
  player1ColorHex,
  player2ColorHex,
}: TutorialBoxShapeLayerProps) {
  const boxes = Object.values(board.boxes);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {boxes.map((box) => (
        <BoxShape
          key={box.id}
          box={box}
          board={board}
          metrics={metrics}
          player1ColorHex={player1ColorHex}
          player2ColorHex={player2ColorHex}
        />
      ))}

      {targetCoord && (
        <TutorialTargetHighlight
          coord={targetCoord}
          board={board}
          metrics={metrics}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fillCell: {
    position: "absolute",
  },
  anchorLabel: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  countText: {
    fontSize: 26,
    fontWeight: "900",
  },
});
