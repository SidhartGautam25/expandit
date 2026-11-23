import React from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGameHistory } from "../hooks/useGameHistory";
import { COLORS } from "../constants/theme";
import { formatPercent } from "../utils/formatting";
import { GameSceneBackground } from "../components/ui/GameSceneBackground";
import { VISIBLE_CAMPAIGN_LEVELS } from "../registries/campaignLevels";

export default function StatsScreen() {
  const router = useRouter();
  const { stats, loading, clearStats } = useGameHistory();

  if (loading) {
    return (
      <GameSceneBackground style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </GameSceneBackground>
    );
  }

  const winRate =
    stats.gamesPlayed > 0
      ? formatPercent(stats.player1Wins, stats.gamesPlayed)
      : "0%";

  // Calculate Average Best Capture % across all won levels
  const wonLevels = Object.values(stats.levelStats || {}).filter(
    (l) => l.bestCapturePercent > 0
  );
  const avgBestCapturePercent =
    wonLevels.length > 0
      ? Math.round(
          wonLevels.reduce((sum, l) => sum + l.bestCapturePercent, 0) /
            wonLevels.length
        )
      : 0;

  const historyList = stats.history || [];

  return (
    <GameSceneBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>
          <Text style={styles.title}>STATISTICS & HISTORY</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* OVERVIEW METRICS CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PERFORMANCE OVERVIEW</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>MATCHES</Text>
                <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
                <Text style={styles.statSubText}>Played</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>WIN RATE</Text>
                <Text style={[styles.statValue, { color: COLORS.accentGold }]}>
                  {winRate}
                </Text>
                <Text style={styles.statSubText}>{stats.player1Wins} Wins</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>AVG BEST CAPTURE</Text>
                <Text style={[styles.statValue, { color: "#A6F238" }]}>
                  {avgBestCapturePercent}%
                </Text>
                <Text style={styles.statSubText}>Across Won Levels</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailsRowGroup}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Player 1 Victories</Text>
                <Text style={[styles.detailValue, { color: COLORS.player1Light }]}>
                  {stats.player1Wins}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Opponent Victories</Text>
                <Text style={[styles.detailValue, { color: COLORS.player2Light }]}>
                  {stats.player2Wins}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Draw Games</Text>
                <Text style={[styles.detailValue, { color: COLORS.text }]}>
                  {stats.draws}
                </Text>
              </View>
            </View>
          </View>

          {/* PER-LEVEL DETAILS CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LEVEL PERFORMANCE & BEST CAPTURE</Text>

            {VISIBLE_CAMPAIGN_LEVELS.map((lvl, index) => {
              const levelData = stats.levelStats?.[lvl.id];
              const gamesPlayed = levelData?.gamesPlayed ?? 0;
              const wins = levelData?.wins ?? 0;
              const bestPercent = levelData?.bestCapturePercent ?? 0;
              const levelWinRate =
                gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

              return (
                <View key={lvl.id} style={styles.levelCardItem}>
                  <View style={styles.levelHeaderRow}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>LVL {lvl.campaignNumber}</Text>
                    </View>
                    <Text style={styles.levelNameText}>{lvl.name}</Text>
                  </View>

                  <View style={styles.levelStatsRow}>
                    <View style={styles.levelStatCol}>
                      <Text style={styles.levelStatLabel}>GAMES PLAYED</Text>
                      <Text style={styles.levelStatVal}>{gamesPlayed}</Text>
                    </View>

                    <View style={styles.levelStatCol}>
                      <Text style={styles.levelStatLabel}>WIN RATE</Text>
                      <Text
                        style={[
                          styles.levelStatVal,
                          { color: wins > 0 ? COLORS.accentGold : COLORS.textMuted },
                        ]}
                      >
                        {gamesPlayed > 0 ? `${levelWinRate}%` : "—"} ({wins}W)
                      </Text>
                    </View>

                    <View style={styles.levelStatColRight}>
                      <Text style={styles.levelStatLabel}>BEST WIN CAPTURE</Text>
                      {bestPercent > 0 ? (
                        <View style={styles.bestCaptureBadge}>
                          <Text style={styles.bestCaptureText}>🏆 {bestPercent}%</Text>
                        </View>
                      ) : (
                        <Text style={styles.noWinText}>No Win Yet</Text>
                      )}
                    </View>
                  </View>

                  {index < VISIBLE_CAMPAIGN_LEVELS.length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </View>
              );
            })}
          </View>

          {/* RECENT MATCH HISTORY */}
          {historyList.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>RECENT MATCH HISTORY</Text>

              {historyList.slice(0, 15).map((match, idx) => {
                const isWin = match.winner === 1;
                const isLoss = match.winner === 2;
                const dateStr = new Date(match.timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <View key={match.id || idx} style={styles.historyRow}>
                    <View style={styles.historyMain}>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyLevelName}>
                          {match.levelName}
                        </Text>
                        <Text style={styles.historyModeTag}>
                          {match.gameMode === "pvp" ? "PVP" : "VS BOT"}
                        </Text>
                        <Text style={styles.historyDate}>{dateStr}</Text>
                      </View>

                      <View style={styles.historyScoreRow}>
                        <Text style={styles.historyScore}>
                          Pts: {match.player1Score} - {match.player2Score}
                        </Text>
                        <Text style={styles.historyCapturePercent}>
                          ({match.player1CapturePercent}% Land)
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.resultBadge,
                        isWin && styles.resultWin,
                        isLoss && styles.resultLoss,
                        !isWin && !isLoss && styles.resultDraw,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultText,
                          isWin && styles.resultTextWin,
                          isLoss && styles.resultTextLoss,
                          !isWin && !isLoss && styles.resultTextDraw,
                        ]}
                      >
                        {isWin ? "VICTORY" : isLoss ? "DEFEAT" : "DRAW"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* RESET DATA AREA */}
          {stats.gamesPlayed > 0 && (
            <Pressable style={styles.clearButton} onPress={clearStats}>
              <Text style={styles.clearText}>RESET STATISTICAL HISTORY</Text>
            </Pressable>
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
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  statSubText: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  detailsRowGroup: {
    marginTop: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.5,
    marginVertical: 12,
  },
  levelCardItem: {
    paddingVertical: 10,
  },
  levelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  levelBadgeText: {
    color: COLORS.accentGold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  levelNameText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  levelStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    padding: 10,
    borderRadius: 8,
  },
  levelStatCol: {
    flex: 1,
  },
  levelStatColRight: {
    alignItems: "flex-end",
  },
  levelStatLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  levelStatVal: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  bestCaptureBadge: {
    backgroundColor: "rgba(166, 242, 56, 0.15)",
    borderColor: "#A6F238",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestCaptureText: {
    color: "#A6F238",
    fontSize: 12,
    fontWeight: "900",
  },
  noWinText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.3,
    marginTop: 10,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  historyMain: {
    flex: 1,
    gap: 4,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyLevelName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  historyModeTag: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.accentGold,
    backgroundColor: "rgba(252, 211, 77, 0.1)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  historyDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  historyScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyScore: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  historyCapturePercent: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultWin: {
    backgroundColor: "rgba(166, 242, 56, 0.15)",
    borderColor: "#A6F238",
  },
  resultLoss: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "#EF4444",
  },
  resultDraw: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#F59E0B",
  },
  resultText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resultTextWin: {
    color: "#A6F238",
  },
  resultTextLoss: {
    color: "#EF4444",
  },
  resultTextDraw: {
    color: "#F59E0B",
  },
  clearButton: {
    backgroundColor: COLORS.player2BgSubtle,
    borderWidth: 1,
    borderColor: COLORS.player2BorderSubtle,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  clearText: {
    color: COLORS.player2Light,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
