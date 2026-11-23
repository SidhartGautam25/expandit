import { GameBoard, getTotalBoxCount, getTotalBoardPoints } from "../../types/board";
import { isBoxCaptured } from "../../types/box";
import { Player } from "../../types/game";
import { WinState } from "../../types/engine";
import { isFrozenPlot } from "./tapRules";

export function checkWinCondition(board: GameBoard): WinState {
  let player1Score = 0;
  let player2Score = 0;
  let occupiedCount = 0;
  const totalBoxes = getTotalBoxCount(board);
  const totalPoints = getTotalBoardPoints(board);

  for (const box of Object.values(board.boxes)) {
    if (isBoxCaptured(box)) {
      occupiedCount++;
      if (box.owner === 1) player1Score += box.size;
      else if (box.owner === 2) player2Score += box.size;
    } else if (isFrozenPlot(box) || box.frozenBy !== null) {
      occupiedCount++;
    }
  }

  const isOver = occupiedCount === totalBoxes;
  let winner: Player | "draw" | null = null;

  if (isOver) {
    if (player1Score > player2Score) winner = 1;
    else if (player2Score > player1Score) winner = 2;
    else winner = "draw";
  }

  return { isOver, winner, player1Score, player2Score, totalBoxes: totalPoints };
}

export function computeScores(board: GameBoard): { player1: number; player2: number } {
  const win = checkWinCondition(board);
  return { player1: win.player1Score, player2: win.player2Score };
}
