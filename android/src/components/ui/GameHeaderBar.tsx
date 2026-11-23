import React from "react";
import { StyleSheet, View } from "react-native";
import { GAME_SCENE } from "../../constants/theme";
import { GamifiedPanel } from "./GamifiedPanel";
import { GameText } from "./GameText";
import { StatPod } from "./StatPod";

interface GameHeaderBarProps {
  levelNumber: number;
  stageName: string;
  botLabel?: string;
  compact?: boolean;
  density?: "normal" | "compact" | "tight";
  gameMode?: "bot" | "pvp";
  dimensions?: { rows: number; cols: number };
}

export function GameHeaderBar({
  levelNumber,
  stageName,
  botLabel,
  compact = false,
  density: densityProp,
  gameMode = "bot",
  dimensions,
}: GameHeaderBarProps) {
  const density = densityProp ?? (compact ? "compact" : "normal");
  const isCompact = density !== "normal";
  const isTight = density === "tight";
  const isPvp = gameMode === "pvp";

  return (
    <GamifiedPanel
      variant="card"
      contentStyle={[
        styles.card,
        isCompact && styles.cardCompact,
        isTight && styles.cardTight,
      ]}
    >
      <View style={styles.titleRow}>
        {!isTight && <View style={styles.skyTag} />}
        <View style={styles.titleBlock}>
          <GameText variant="title" style={isTight && styles.titleTight}>
            {isPvp ? (isTight ? "PVP" : "👥 PVP Match") : `Stage ${levelNumber}`}
          </GameText>
          <GameText
            variant="subtitle"
            numberOfLines={1}
            style={isTight && styles.subtitleTight}
          >
            {isPvp && dimensions
              ? `${dimensions.rows}×${dimensions.cols}${isTight ? "" : ` Board · ${stageName}`}`
              : stageName}
          </GameText>
          {!isPvp && !isTight && botLabel ? (
            <GameText variant="bodyMuted">{botLabel}</GameText>
          ) : null}
        </View>
      </View>
    </GamifiedPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cardTight: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skyTag: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: GAME_SCENE.panels.score.versusBg,
    borderWidth: 1,
    borderColor: GAME_SCENE.panels.banner.border,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  titleTight: {
    fontSize: 14,
    lineHeight: 16,
  },
  subtitleTight: {
    fontSize: 11,
    lineHeight: 13,
  },
});
