import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GameBoard } from "../../types/board";
import { GameBox } from "../../types/box";
import { Player } from "../../types/game";
import {
  getBoxFillColor,
  getCapturedCountTextColor,
  getCapturedStrokeColor,
  lightenColor,
} from "../../engine/board/boxColors";
import {
  COLORS,
  PLAYER_CAPTURE_COLORS,
} from "../../constants/theme";
import {
  BoardMetrics,
  getCellFillLayout,
  getCellCornerRadius,
  getCellStrokeLayout,
  getBoxOuterCorners,
  getBoxUnionBounds,
  getBoxUnionCornerRadius,
  OuterCorner,
  PLOT_STROKE_WIDTH,
  CellLayout,
} from "../../engine/board/boardLayout";
import { getRewardPreview, getPowerPreview } from "../../engine/board/boardFactory";

const AnimatedView = Animated.createAnimatedComponent(View);

const BOT_BRACKET_COLOR = COLORS.botBracket;
const LAST_MOVE_ON_FROZEN_LIGHT = "#B45309";
const LAST_MOVE_ON_FROZEN_DARK = "#D97706";

function getLastMoveBracketStyle(
  box: GameBox,
  player1ColorHex: string,
  player2ColorHex: string
): {
  color: string;
  armScale: number;
  thicknessScale: number;
  showFrozenRing: boolean;
} {
  const isCaptured = box.owner !== null && box.count >= box.captureThreshold;
  const isFrozen = box.frozenBy !== null && !isCaptured;
  if (!isFrozen) {
    return {
      color: BOT_BRACKET_COLOR,
      armScale: 1,
      thicknessScale: 1,
      showFrozenRing: false,
    };
  }

  const freezerColor =
    box.frozenBy === 1 ? player1ColorHex : player2ColorHex;
  const onLightFill = isLightCaptureColor(freezerColor);

  return {
    color: onLightFill ? LAST_MOVE_ON_FROZEN_LIGHT : LAST_MOVE_ON_FROZEN_DARK,
    armScale: 1.05,
    thicknessScale: 1.2,
    showFrozenRing: true,
  };
}

function FrozenLastMoveRing({
  union,
  cornerRadius,
  color,
}: {
  union: CellLayout;
  cornerRadius: ReturnType<typeof getBoxUnionCornerRadius>;
  color: string;
}) {
  const inset = 1;
  const borderWidth = 2;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.frozenLastMoveRing,
        cornerRadius,
        {
          left: union.left - inset,
          top: union.top - inset,
          width: union.width + inset * 2,
          height: union.height + inset * 2,
          borderColor: color,
          borderWidth,
        },
      ]}
    />
  );
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

/** Pick the cell that best fits a centered count label (avoids L-shape bbox gaps). */
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

interface BoxShapeLayerProps {
  board: GameBoard;
  metrics: BoardMetrics;
  lastBotBoxIds: Set<string>;
  player1ColorHex?: string;
  player2ColorHex?: string;
}

function CornerBracket({
  x,
  y,
  corner,
  arm,
  thickness,
  radius,
  color,
  emphasis = false,
}: {
  x: number;
  y: number;
  corner: OuterCorner;
  arm: number;
  thickness: number;
  radius: number;
  color: string;
  emphasis?: boolean;
}) {
  const inset = thickness * 0.6;
  const r = Math.max(radius, 4);

  const base = {
    position: "absolute" as const,
    width: arm,
    height: arm,
    backgroundColor: "transparent",
    borderColor: color,
  };

  switch (corner) {
    case "tl":
      return (
        <View
          pointerEvents="none"
          style={[
            styles.bracketArc,
            base,
            {
              left: x + inset,
              top: y + inset,
              borderTopWidth: thickness,
              borderLeftWidth: thickness,
              borderTopLeftRadius: r,
            },
          ]}
        />
      );
    case "tr":
      return (
        <View
          pointerEvents="none"
          style={[
            styles.bracketArc,
            base,
            {
              left: x - arm - inset,
              top: y + inset,
              borderTopWidth: thickness,
              borderRightWidth: thickness,
              borderTopRightRadius: r,
            },
          ]}
        />
      );
    case "bl":
      return (
        <View
          pointerEvents="none"
          style={[
            styles.bracketArc,
            base,
            {
              left: x + inset,
              top: y - arm - inset,
              borderBottomWidth: thickness,
              borderLeftWidth: thickness,
              borderBottomLeftRadius: r,
            },
          ]}
        />
      );
    case "br":
      return (
        <View
          pointerEvents="none"
          style={[
            styles.bracketArc,
            base,
            {
              left: x - arm - inset,
              top: y - arm - inset,
              borderBottomWidth: thickness,
              borderRightWidth: thickness,
              borderBottomRightRadius: r,
            },
          ]}
        />
      );
  }
}

function BotCornerBrackets({
  board,
  box,
  metrics,
  player1ColorHex = PLAYER_CAPTURE_COLORS.player1,
  player2ColorHex = PLAYER_CAPTURE_COLORS.player2,
}: {
  board: GameBoard;
  box: GameBox;
  metrics: BoardMetrics;
  player1ColorHex?: string;
  player2ColorHex?: string;
}) {
  const corners = getBoxOuterCorners(board, box, metrics, PLOT_STROKE_WIDTH);
  if (corners.length === 0) return null;

  const bracketStyle = getLastMoveBracketStyle(
    box,
    player1ColorHex,
    player2ColorHex
  );
  const union = getBoxUnionBounds(board, box, metrics);
  const unionCorners = getBoxUnionCornerRadius(board, box, metrics);
  const arm = Math.max(12, metrics.cellSize * 0.24) * bracketStyle.armScale;
  const thickness =
    Math.max(2, metrics.cellSize * 0.04) * bracketStyle.thicknessScale;

  return (
    <>
      {bracketStyle.showFrozenRing ? (
        <FrozenLastMoveRing
          union={union}
          cornerRadius={unionCorners}
          color={bracketStyle.color}
        />
      ) : null}
      {corners.map((c, i) => (
        <CornerBracket
          key={`bracket-${box.id}-${i}`}
          x={c.left}
          y={c.top}
          corner={c.corner}
          arm={arm}
          thickness={thickness}
          radius={c.radius}
          color={bracketStyle.color}
          emphasis={bracketStyle.showFrozenRing}
        />
      ))}
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
  const pulse = useSharedValue(1);
  const isCaptured = box.owner !== null && box.count >= box.captureThreshold;
  const isDanger = box.count === box.captureThreshold - 1 && box.owner === null;
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

  const strokeWidth = isDanger ? 3 : PLOT_STROKE_WIDTH;
  const strokeColor = isCaptured
    ? getCapturedStrokeColor(playerColor)
    : isDanger
      ? COLORS.dangerFill
      : lightenColor(box.baseColor, 0.42);
  const countTextColor = isCaptured
    ? getCapturedCountTextColor(playerColor)
    : COLORS.text;

  useEffect(() => {
    if (isDanger) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.65, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isDanger, pulse]);

  const strokePulseStyle = useAnimatedStyle(() => ({
    opacity: isDanger ? pulse.value : 1,
  }));

  const lootLabel =
    box.count === 0 ? getRewardPreview(box) || getPowerPreview(box) : "";

  const union = getBoxUnionBounds(board, box, metrics);
  const unionCorners = getBoxUnionCornerRadius(board, box, metrics);
  const circledCountLayout = showFreezeVisual
    ? getCircledCountLayout(getLabelCellLayout(board, box, metrics), metrics)
    : null;

  return (
    <>
      {!showFreezeVisual
        ? box.cells.map((cell) => {
            const stroke = getCellStrokeLayout(board, box, cell, metrics, strokeWidth);
            const corners = getCellCornerRadius(board, box, cell, metrics);
            return (
              <AnimatedView
                key={`stroke-${box.id}-${cell.row}-${cell.col}`}
                pointerEvents="none"
                style={[
                  styles.fillCell,
                  corners,
                  strokePulseStyle,
                  {
                    left: stroke.left,
                    top: stroke.top,
                    width: stroke.width,
                    height: stroke.height,
                    backgroundColor: strokeColor,
                  },
                ]}
              />
            );
          })
        : null}

      {!showFreezeVisual
        ? box.cells.map((cell) => {
            const fill = getCellFillLayout(board, box, cell, metrics);
            const corners = getCellCornerRadius(board, box, cell, metrics);
            return (
              <View
                key={`fill-${box.id}-${cell.row}-${cell.col}`}
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
            );
          })
        : (
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

      {box.count === 0 && lootLabel && !showFreezeVisual ? (
        <View
          pointerEvents="none"
          style={[
            styles.anchorLabel,
            getCellFillLayout(board, box, box.anchor, metrics),
          ]}
        >
          <Text style={styles.lootIcons}>{lootLabel}</Text>
        </View>
      ) : null}

      {box.count > 0 && !showFreezeVisual && (
        <View
          pointerEvents="none"
          style={[
            styles.anchorLabel,
            getCellFillLayout(board, box, box.anchor, metrics),
          ]}
        >
          <Text style={[styles.countText, { color: countTextColor }]}>{box.count}</Text>
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

export function BoxShapeLayer({
  board,
  metrics,
  lastBotBoxIds,
  player1ColorHex,
  player2ColorHex,
}: BoxShapeLayerProps) {
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

      {boxes.map((box) => {
        if (!lastBotBoxIds.has(box.id)) return null;
        return (
          <BotCornerBrackets
            key={`bot-brackets-${box.id}`}
            board={board}
            box={box}
            metrics={metrics}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fillCell: {
    position: "absolute",
  },
  bracketArc: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  frozenLastMoveRing: {
    position: "absolute",
    backgroundColor: "transparent",
    zIndex: 25,
    opacity: 0.9,
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
  lootIcons: {
    fontSize: 18,
  },
});
