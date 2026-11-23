import React, { useEffect } from "react";
import { StyleSheet, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { COLORS, ANIMATIONS, getPlayerCaptureColor } from "../../constants/theme";
import { Player } from "../../types/game";
import {
  getBoxFillColor,
  getBoxBorderColor,
  getCapturedCountTextColor,
} from "../../engine/board/boxColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GAP = 2;

interface CellNeighbors {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

interface TileBoxProps {
  count: number;
  maxCount: number;
  owner: Player | null;
  baseColor: string;
  isAnchor: boolean;
  frozenBy: Player | null;
  rewardPreview?: string;
  powerPreview?: string;
  cellNeighbors?: CellNeighbors;
  isExcludedThisTurn?: boolean;
  onPress: () => void;
  disabled: boolean;
  isBotLastMoveBox?: boolean;
  targetingMode?: boolean;
}

export function TileBox({
  count,
  maxCount,
  owner,
  baseColor,
  isAnchor,
  frozenBy,
  rewardPreview = "",
  powerPreview = "",
  cellNeighbors,
  isExcludedThisTurn = false,
  onPress,
  disabled,
  isBotLastMoveBox = false,
  targetingMode = false,
}: TileBoxProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const isCaptured = owner !== null && count >= maxCount;
  const isDanger = count === maxCount - 1 && owner === null;
  const playerColor =
    owner !== null ? getPlayerCaptureColor(owner) : baseColor;

  const hasTop = cellNeighbors?.top ?? false;
  const hasBottom = cellNeighbors?.bottom ?? false;
  const hasLeft = cellNeighbors?.left ?? false;
  const hasRight = cellNeighbors?.right ?? false;

  useEffect(() => {
    if (isDanger) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 550 }),
          withTiming(0.92, { duration: 550 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isDanger, pulse]);

  const handlePressIn = () => {
    if (disabled || isCaptured || isExcludedThisTurn) return;
    scale.value = withSpring(0.93, ANIMATIONS.springConfig);
  };

  const handlePressOut = () => {
    if (disabled || isCaptured || isExcludedThisTurn) return;
    scale.value = withSpring(1, ANIMATIONS.springConfig);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isDanger ? pulse.value : scale.value }],
    opacity: isExcludedThisTurn ? 0.3 : 1,
  }));

  const fillColor = getBoxFillColor(
    baseColor,
    count,
    maxCount,
    isCaptured,
    playerColor
  );

  const borderColor = isBotLastMoveBox
    ? COLORS.botHighlight
    : getBoxBorderColor(baseColor, isCaptured, playerColor, isDanger);

  const borderWidth = isBotLastMoveBox ? 3.5 : isDanger ? 2.5 : isCaptured ? 2.5 : 1.5;

  const getMarginStyle = () => ({
    marginTop: hasTop ? 0 : GAP,
    marginBottom: hasBottom ? 0 : GAP,
    marginLeft: hasLeft ? 0 : GAP,
    marginRight: hasRight ? 0 : GAP,
  });

  const getBorderStyle = () => {
    let borderStyle: "solid" | "dotted" | "dashed" = "solid";
    if (frozenBy !== null) borderStyle = "dotted";
    else if (targetingMode && !isCaptured) borderStyle = "dashed";
    else if (isBotLastMoveBox) borderStyle = "solid";

    return {
      borderColor: frozenBy !== null
        ? getPlayerCaptureColor(frozenBy)
        : targetingMode && !isCaptured
          ? COLORS.accentGold
          : borderColor,
      borderStyle,
      borderTopWidth: hasTop ? 0 : borderWidth,
      borderBottomWidth: hasBottom ? 0 : borderWidth,
      borderLeftWidth: hasLeft ? 0 : borderWidth,
      borderRightWidth: hasRight ? 0 : borderWidth,
    };
  };

  const getBorderRadiusStyle = () => {
    const r = 9;
    return {
      borderTopLeftRadius: hasTop || hasLeft ? 0 : r,
      borderTopRightRadius: hasTop || hasRight ? 0 : r,
      borderBottomLeftRadius: hasBottom || hasLeft ? 0 : r,
      borderBottomRightRadius: hasBottom || hasRight ? 0 : r,
    };
  };

  const showCount = count > 0;
  const lootLabel = rewardPreview || powerPreview;

  return (
    <AnimatedPressable
      style={[
        styles.tile,
        getMarginStyle(),
        { backgroundColor: fillColor },
        getBorderStyle(),
        getBorderRadiusStyle(),
        isBotLastMoveBox && styles.botGlow,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isExcludedThisTurn || (isCaptured && !targetingMode)}
    >
      {isBotLastMoveBox && !isCaptured && (
        <View pointerEvents="none" style={styles.botOverlay} />
      )}

      {isCaptured && !hasTop && (
        <View pointerEvents="none" style={styles.captureShine} />
      )}

      {showCount && isAnchor && (
        <Text
          style={[
            styles.countText,
            { color: isCaptured ? getCapturedCountTextColor(playerColor) : COLORS.text },
          ]}
        >
          {count}
        </Text>
      )}

      {!showCount && isAnchor && lootLabel ? (
        <Text style={styles.lootIcons}>{lootLabel}</Text>
      ) : null}

      {isAnchor && frozenBy !== null && (
        <View style={styles.freezeBadge}>
          <Text style={styles.freezeIcon}>❄</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  botGlow: {
    shadowColor: COLORS.player2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
  botOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.player2BgStrong,
  },
  captureShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "42%",
    backgroundColor: COLORS.shine,
  },
  countText: {
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: COLORS.textShadowLight,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  lootIcons: {
    fontSize: 15,
    opacity: 0.9,
  },
  freezeBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.inkSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  freezeIcon: {
    fontSize: 9,
  },
});
