import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameStats, LevelStats, MatchRecord, SaveMatchParams, Player } from "../types/game";

const STATS_STORAGE_KEY = "@cascade_grid_stats";

const INITIAL_STATS: GameStats = {
  gamesPlayed: 0,
  player1Wins: 0,
  player2Wins: 0,
  draws: 0,
  levelStats: {},
  history: [],
};

export function useGameHistory() {
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await AsyncStorage.getItem(STATS_STORAGE_KEY);
      if (data && data !== "undefined" && data !== "null") {
        const parsed = JSON.parse(data);
        setStats({
          gamesPlayed: parsed.gamesPlayed ?? 0,
          player1Wins: parsed.player1Wins ?? 0,
          player2Wins: parsed.player2Wins ?? 0,
          draws: parsed.draws ?? 0,
          levelStats: parsed.levelStats ?? {},
          history: parsed.history ?? [],
        });
      }
    } catch (e) {
      console.error("Failed to load game history stats:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveMatch(matchData: SaveMatchParams | Player | "draw" | null) {
    if (!matchData) return;

    let params: SaveMatchParams;
    if (typeof matchData === "number" || matchData === "draw") {
      params = {
        winner: matchData,
        levelId: "campaign-1",
        levelName: "Level 1",
        gameMode: "bot",
        player1Score: 0,
        player2Score: 0,
        totalBoardPoints: 0,
      };
    } else {
      params = matchData;
    }

    const { winner, levelId, levelName, gameMode, player1Score, player2Score, totalBoardPoints } = params;

    const currentLevelStats = stats.levelStats ? { ...stats.levelStats } : {};
    const currentHistory = stats.history ? [...stats.history] : [];

    const newStats: GameStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      player1Wins: stats.player1Wins + (winner === 1 ? 1 : 0),
      player2Wins: stats.player2Wins + (winner === 2 ? 1 : 0),
      draws: stats.draws + (winner === "draw" ? 1 : 0),
      levelStats: currentLevelStats,
      history: currentHistory,
    };

    const capturePercent = totalBoardPoints > 0
      ? Math.round((player1Score / totalBoardPoints) * 100)
      : 0;

    const existingLevel: LevelStats = currentLevelStats[levelId] || {
      levelId,
      levelName: levelName || levelId,
      gamesPlayed: 0,
      wins: 0,
      bestCapturePercent: 0,
    };

    const isUserWin = winner === 1;
    const newWins = existingLevel.wins + (isUserWin ? 1 : 0);
    // Best capture % updates ONLY when user wins and the new capture % is higher than current best
    const newBestPercent = isUserWin
      ? Math.max(existingLevel.bestCapturePercent, capturePercent)
      : existingLevel.bestCapturePercent;

    currentLevelStats[levelId] = {
      ...existingLevel,
      levelName: levelName || existingLevel.levelName,
      gamesPlayed: existingLevel.gamesPlayed + 1,
      wins: newWins,
      bestCapturePercent: newBestPercent,
    };

    const record: MatchRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      levelId,
      levelName: levelName || levelId,
      gameMode,
      winner,
      player1Score,
      player2Score,
      totalBoardPoints,
      player1CapturePercent: capturePercent,
    };

    newStats.history = [record, ...currentHistory].slice(0, 50);

    try {
      await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
      setStats(newStats);
    } catch (e) {
      console.error("Failed to save match statistics:", e);
    }
  }

  async function clearStats() {
    try {
      await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(INITIAL_STATS));
      setStats(INITIAL_STATS);
    } catch (e) {
      console.error("Failed to clear game history stats:", e);
    }
  }

  return {
    stats,
    loading,
    saveMatch,
    clearStats,
  };
}
