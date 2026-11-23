import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useGameConfig } from "../hooks/useGameConfig";
import { useCampaignProgress } from "../hooks/useCampaignProgress";
import { ALL_CAMPAIGN_LEVELS, getCampaignLevel } from "../registries/campaignLevels";
import { CampaignLevelSelector } from "../components/ui/CampaignLevelSelector";
import { GameSceneBackground } from "../components/ui/GameSceneBackground";
import { COLORS } from "../constants/theme";
import { createBoardFromLevel } from "../engine/board/boardFactory";
import { CampaignLevel } from "../types/level";

function BoardPreview({ level, size = 80 }: { level: CampaignLevel; size?: number }) {
  const board = React.useMemo(() => {
    return createBoardFromLevel(level);
  }, [level]);

  const cellSize = size / Math.max(level.rows, level.cols);
  const boardWidth = cellSize * level.cols;
  const boardHeight = cellSize * level.rows;

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
      }}
    >
      <View style={{ width: boardWidth, height: boardHeight, position: "relative" }}>
        {Array.from({ length: board.rows }).map((_, r) => {
          const isTopHalf = r < Math.floor(board.rows / 2);
          return Array.from({ length: board.cols }).map((_, c) => (
            <View
              key={`cell-${r}-${c}`}
              style={{
                position: "absolute",
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize - 1,
                height: cellSize - 1,
                backgroundColor: isTopHalf ? "#EFF6FF" : "#FFF7ED",
                borderColor: isTopHalf ? "rgba(59, 130, 246, 0.2)" : "rgba(234, 88, 12, 0.2)",
                borderWidth: 0.5,
              }}
            />
          ));
        })}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: Math.floor(board.rows / 2) * cellSize - 1,
            height: 2,
            backgroundColor: "#FACC15",
          }}
        />
      </View>
    </View>
  );
}

export default function ConfigScreen() {
  const router = useRouter();
  const { config, loading, updateConfig, reloadConfig } = useGameConfig();
  const {
    progress,
    loading: progressLoading,
    highestUnlockedLevelId,
    reloadProgress,
  } = useCampaignProgress();

  const campaignLevel = getCampaignLevel(config.campaignLevelId ?? "campaign-1");

  useFocusEffect(
    React.useCallback(() => {
      void reloadProgress();
      void reloadConfig();
    }, [reloadProgress, reloadConfig])
  );

  useEffect(() => {
    if (loading || progressLoading) return;
    if (config.gameMode !== "bot") return;
    if (campaignLevel.campaignNumber > progress.highestUnlocked) {
      updateConfig({ campaignLevelId: highestUnlockedLevelId });
    }
  }, [
    loading,
    progressLoading,
    config.gameMode,
    campaignLevel.campaignNumber,
    progress.highestUnlocked,
    highestUnlockedLevelId,
    updateConfig,
  ]);

  if (loading || progressLoading) {
    return (
      <GameSceneBackground style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading configurations...</Text>
      </GameSceneBackground>
    );
  }

  return (
    <GameSceneBackground>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.title}>GAME SETTINGS</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GAME MODE</Text>
          <View style={styles.modeToggleRow}>
            <Pressable
              style={[
                styles.modeButton,
                config.gameMode === "bot" && styles.modeButtonSelected,
              ]}
              onPress={() => updateConfig({ gameMode: "bot" })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  config.gameMode === "bot" && styles.modeButtonTextSelected,
                ]}
              >
                🤖 VS BOT
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                config.gameMode === "pvp" && styles.modeButtonSelected,
              ]}
              onPress={() => updateConfig({ gameMode: "pvp" })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  config.gameMode === "pvp" && styles.modeButtonTextSelected,
                ]}
              >
                👥 PVP OFFLINE
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hintText}>
            {config.gameMode === "bot"
              ? "Choose your campaign stage below. Beat each stage to unlock the next."
              : "Play offline player vs player. Choose a custom board design below to play on."}
          </Text>
        </View>

        {config.gameMode === "bot" && (
          <View style={styles.card}>
            <CampaignLevelSelector
              currentLevelId={config.campaignLevelId ?? "campaign-1"}
              onSelectLevel={(id) => updateConfig({ campaignLevelId: id })}
              highestUnlocked={progress.highestUnlocked}
              completedLevelIds={progress.completedLevelIds}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PLAYER 1 COLOR</Text>
          <View style={styles.modeToggleRow}>
            <Pressable
              style={[
                styles.modeButton,
                config.player1Color === "white" && styles.modeButtonSelected,
              ]}
              onPress={() => updateConfig({ player1Color: "white" })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  config.player1Color === "white" && styles.modeButtonTextSelected,
                ]}
              >
                🔵 BLUE
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                config.player1Color === "black" && styles.modeButtonSelected,
              ]}
              onPress={() => updateConfig({ player1Color: "black" })}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  config.player1Color === "black" && styles.modeButtonTextSelected,
                ]}
              >
                🟠 ORANGE
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hintText}>
            {config.gameMode === "bot"
              ? "Choose your land capture color vs the Bot. The bot will automatically take the opposite color."
              : "Choose the color for Player 1. Player 2 will automatically take the opposite color."}
          </Text>
        </View>

        {config.gameMode === "pvp" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SELECT PVP BOARD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardsContainer}>
              {ALL_CAMPAIGN_LEVELS.map((level) => {
                const isSelected = config.campaignLevelId === level.id;
                return (
                  <Pressable
                    key={level.id}
                    style={[
                      styles.boardOptionCard,
                      isSelected && styles.boardOptionCardSelected,
                    ]}
                    onPress={() => updateConfig({ campaignLevelId: level.id })}
                  >
                    <BoardPreview level={level} size={80} />
                    <Text style={[styles.boardOptionName, isSelected && styles.boardOptionTextSelected]} numberOfLines={1}>
                      {level.name}
                    </Text>
                    <Text style={styles.boardOptionSize}>
                      {level.rows}×{level.cols}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </GameSceneBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  modeButtonSelected: {
    backgroundColor: COLORS.player1,
    borderColor: COLORS.player1,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  modeButtonTextSelected: {
    color: COLORS.onPrimary,
  },
  hintText: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  boardsContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  boardOptionCard: {
    width: 105,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  boardOptionCardSelected: {
    borderColor: COLORS.player1,
    backgroundColor: COLORS.player1BgSoft,
  },
  boardOptionName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
    width: "100%",
  },
  boardOptionTextSelected: {
    color: COLORS.text,
  },
  boardOptionSize: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
});
