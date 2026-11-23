import { useRef, useCallback, useEffect, useState } from "react";
import { GameBoard } from "../types/board";
import { getBotMoveForLevel } from "../engine/ai/aiEngine";

interface BotControllerOptions {
  gameMode: "bot" | "pvp";
  botDifficulty: number;
  gameStatus: string;
  onBotMove: (row: number, col: number) => Promise<void>;
  onBotTurnEnd: () => void;
}

export function useBotController({
  gameMode,
  botDifficulty,
  gameStatus,
  onBotMove,
  onBotTurnEnd,
}: BotControllerOptions) {
  const [isBotThinking, setIsBotThinking] = useState(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  const cancelBot = useCallback(() => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setIsBotThinking(false);
  }, []);

  const scheduleBotTurn = useCallback(
    (board: GameBoard, tapsRemaining: number, onBeforeMove?: () => void) => {
      if (gameMode !== "bot" || gameStatus !== "playing") return;

      setIsBotThinking(true);
      onBeforeMove?.();

      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

      botTimeoutRef.current = setTimeout(async () => {
        try {
          const move = getBotMoveForLevel(botDifficulty, board, 2, tapsRemaining);
          if (move) {
            await onBotMove(move.row, move.col);
          } else {
            onBotTurnEnd();
          }
        } catch (e) {
          console.error("Bot move failed:", e);
          onBotTurnEnd();
        } finally {
          setIsBotThinking(false);
        }
      }, 1000);
    },
    [gameMode, botDifficulty, gameStatus, onBotMove, onBotTurnEnd]
  );

  return { isBotThinking, scheduleBotTurn, cancelBot, setIsBotThinking };
}
