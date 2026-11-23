import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { COLORS } from "../../constants/theme";
import { APP_NAME } from "../../constants/app";
import { GameStats } from "../../types/game";
import { formatPercent } from "../../utils/formatting";

interface HeaderBarProps {
  stats: GameStats;
  onReset: () => void;
  onClearHistory: () => void;
  timer: number;
}

export function HeaderBar({ stats, onReset, onClearHistory, timer }: HeaderBarProps) {
  const winRate = stats.gamesPlayed > 0 
    ? formatPercent(stats.player1Wins, stats.gamesPlayed) 
    : "0%";

  // Format timer into MM:SS
  const mins = Math.floor(timer / 60);
  const secs = timer % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      {/* Upper Row */}
      <View style={styles.upperRow}>
        <View>
          <Text style={styles.title}>{APP_NAME.toUpperCase()}</Text>
        </View>

        <View style={styles.rightActions}>
          {/* Timer Display */}
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>TIME</Text>
            <Text style={styles.timerValue}>{timeStr}</Text>
          </View>
          
          {/* Reset Button */}
          <Pressable style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>PLAYED</Text>
          <Text style={styles.statVal}>{stats.gamesPlayed}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>WINS</Text>
          <Text style={[styles.statVal, { color: COLORS.player1Light }]}>
            {stats.player1Wins}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>LOSSES</Text>
          <Text style={[styles.statVal, { color: COLORS.player2Light }]}>
            {stats.player2Wins}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>WIN RATE</Text>
          <Text style={[styles.statVal, { color: COLORS.accentGold }]}>
            {winRate}
          </Text>
        </View>

        {stats.gamesPlayed > 0 && (
          <>
            <View style={styles.statDivider} />
            <Pressable style={styles.clearBtn} onPress={onClearHistory}>
              <Text style={styles.clearBtnText}>CLEAR</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  upperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 2,
    lineHeight: 26,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerBox: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  resetButton: {
    backgroundColor: COLORS.player1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: COLORS.player1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resetText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 1,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
  },
  clearBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.player2Light,
    letterSpacing: 0.5,
  },
});
