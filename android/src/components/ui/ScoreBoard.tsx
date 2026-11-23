import React from "react";
import { StyleSheet, View } from "react-native";
import { GAME_SCENE, PLAYER_CAPTURE_COLORS } from "../../constants/theme";
import { GamifiedPanel } from "./GamifiedPanel";
import { GameText } from "./GameText";
import { formatPercent } from "../../utils/formatting";
import { Player } from "../../types/game";

interface ScoreBoardProps {
  player1Score: number;
  player2Score: number;
  activePlayer: Player;
  isBotThinking: boolean;
  winner: Player | "draw" | null;
  gameMode: "bot" | "pvp";
  tapsRemaining: number;
  tapsPerTurn: number;
  totalBoxes: number;
  powerMessage?: string | null;
  player1ColorHex?: string;
  player2ColorHex?: string;
  compact?: boolean;
  density?: "normal" | "compact" | "tight";
}

const scoreTokens = GAME_SCENE.panels.score;

function PlayerScoreCard({
  label,
  score,
  percent,
  isActive,
  compact,
  density = compact ? "compact" : "normal",
}: {
  label: string;
  score: number;
  percent: string;
  isActive: boolean;
  compact?: boolean;
  density?: "normal" | "compact" | "tight";
}) {
  const isTight = density === "tight";
  const isCompact = density !== "normal";
  return (
    <GamifiedPanel
      variant="stat"
      style={styles.playerPodWrap}
      contentStyle={[
        styles.playerPod,
        isCompact && styles.playerPodCompact,
        isTight && styles.playerPodTight,
        isActive && styles.playerPodActive,
      ]}
    >
      <GameText
        variant="label"
        style={[isCompact && styles.compactLabel, isTight && styles.tightLabel]}
      >
        {label}
      </GameText>
      <GameText
        variant="score"
        style={[isCompact && styles.compactScore, isTight && styles.tightScore]}
      >
        {score}
      </GameText>
      {!isTight && (
        <View style={[styles.claimedPill, isCompact && styles.claimedPillCompact]}>
          <GameText variant="pill" style={isCompact ? styles.compactPill : undefined}>
            {percent} claimed
          </GameText>
        </View>
      )}
    </GamifiedPanel>
  );
}

export function ScoreBoard({
  player1Score,
  player2Score,
  activePlayer,
  isBotThinking,
  winner,
  gameMode,
  tapsRemaining,
  tapsPerTurn,
  totalBoxes,
  powerMessage,
  compact = false,
  density: densityProp,
}: ScoreBoardProps) {
  const density = densityProp ?? (compact ? "compact" : "normal");
  const isCompact = density !== "normal";
  const isTight = density === "tight";
  const p1Percent = formatPercent(player1Score, totalBoxes);
  const p2Percent = formatPercent(player2Score, totalBoxes);
  const isBotMode = gameMode === "bot";

  let statusText = "";

  if (winner) {
    if (winner === 1) {
      statusText = isBotMode ? "🏆 Victory! You won!" : "🏆 Player 1 Wins!";
    } else if (winner === 2) {
      statusText = isBotMode ? "💀 Defeat! Bot won." : "🏆 Player 2 Wins!";
    } else {
      statusText = "🤝 Draw Match!";
    }
  } else if (isBotThinking) {
    statusText = "🤖 Bot is thinking...";
  } else if (powerMessage) {
    statusText = powerMessage;
  } else if (activePlayer === 1) {
    const tapWord = tapsRemaining === 1 ? "action" : "actions";
    statusText = isBotMode
      ? `Your turn · ${tapsRemaining} ${tapWord} left`
      : `Player 1 turn · ${tapsRemaining} ${tapWord} left`;
  } else {
    const tapWord = tapsRemaining === 1 ? "action" : "actions";
    statusText = isBotMode
      ? `Bot turn · ${tapsRemaining} ${tapWord} left`
      : `Player 2 turn · ${tapsRemaining} ${tapWord} left`;
  }

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        isTight && styles.containerTight,
      ]}
    >
      <GamifiedPanel
        variant="score"
        contentStyle={[
          styles.scoreCard,
          isCompact && styles.scoreCardCompact,
          isTight && styles.scoreCardTight,
        ]}
      >
        {density === "normal" && (
          <GameText variant="label" style={styles.scoreHeading}>
            Territory
          </GameText>
        )}

        <View
          style={[
            styles.playersRow,
            isCompact && styles.playersRowCompact,
            isTight && styles.playersRowTight,
          ]}
        >
          <PlayerScoreCard
            label={isBotMode ? "You" : "Player 1"}
            score={player1Score}
            percent={p1Percent}
            isActive={activePlayer === 1 && !winner}
            density={density}
          />

          <View
            style={[
              styles.versusBadge,
              isCompact && styles.versusBadgeCompact,
              isTight && styles.versusBadgeTight,
            ]}
          >
            <GameText variant="pill" style={[styles.versusText, isTight && styles.versusTextTight]}>
              VS
            </GameText>
          </View>

          <PlayerScoreCard
            label={isBotMode ? "Bot" : "Player 2"}
            score={player2Score}
            percent={p2Percent}
            isActive={activePlayer === 2 && !winner}
            density={density}
          />
        </View>
      </GamifiedPanel>

      <GamifiedPanel
        variant="banner"
        contentStyle={[
          styles.turnBanner,
          isCompact && styles.turnBannerCompact,
          isTight && styles.turnBannerTight,
        ]}
      >
        <GameText
          variant="body"
          style={[styles.statusText, isTight && styles.statusTextTight]}
          numberOfLines={1}
        >
          {statusText}
        </GameText>
      </GamifiedPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    marginVertical: 6,
    gap: 8,
  },
  containerCompact: {
    marginVertical: 2,
    gap: 3,
    paddingHorizontal: 12,
  },
  containerTight: {
    marginVertical: 0,
    gap: 2,
    paddingHorizontal: 10,
  },
  scoreCard: {
    padding: 12,
    gap: 10,
  },
  scoreCardCompact: {
    padding: 6,
    gap: 4,
  },
  scoreCardTight: {
    padding: 4,
    gap: 2,
  },
  scoreHeading: {
    textAlign: "center",
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playersRowCompact: {
    gap: 6,
  },
  playersRowTight: {
    gap: 4,
  },
  playerPodWrap: {
    flex: 1,
  },
  playerPod: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  playerPodCompact: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 0,
  },
  playerPodTight: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  compactLabel: {
    fontSize: 10,
  },
  tightLabel: {
    fontSize: 9,
  },
  compactScore: {
    fontSize: 22,
    lineHeight: 24,
  },
  tightScore: {
    fontSize: 18,
    lineHeight: 20,
  },
  compactPill: {
    fontSize: 8,
  },
  playerPodActive: {
    borderColor: scoreTokens.cardActiveRing,
    borderWidth: 2,
  },
  claimedPill: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: scoreTokens.claimedBg,
    borderWidth: 1,
    borderColor: scoreTokens.claimedBorder,
  },
  claimedPillCompact: {
    marginTop: 2,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  versusBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: scoreTokens.versusBg,
    borderWidth: 1.5,
    borderColor: scoreTokens.versusBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  versusBadgeCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  versusBadgeTight: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  versusText: {
    color: GAME_SCENE.text.onSky,
    fontSize: 8,
  },
  versusTextTight: {
    fontSize: 7,
  },
  turnBanner: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  turnBannerCompact: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  turnBannerTight: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusText: {
    textAlign: "center",
  },
  statusTextTight: {
    fontSize: 11,
    lineHeight: 14,
  },
});
