import { GameBoard, getTotalBoardPoints } from "../../types/board";
import { Player } from "../../types/game";
import { WinState } from "../../types/engine";
import { hasAnyLegalMoveForPlayer } from "../board/blockEngine";

export function computeScores(board: GameBoard): { player1: number; player2: number } {
  let player1 = 0;
  let player2 = 0;

  for (const box of Object.values(board.boxes)) {
    if (box.owner === 1) {
      player1 += box.size;
    } else if (box.owner === 2) {
      player2 += box.size;
    }
  }

  return { player1, player2 };
}

export function checkWinCondition(board: GameBoard): WinState {
  const { player1: player1Score, player2: player2Score } = computeScores(board);
  const totalCells = getTotalBoardPoints(board);
  const occupiedCount = player1Score + player2Score;

  const isFull = occupiedCount >= totalCells;
  const p1HasMoves = hasAnyLegalMoveForPlayer(board, 1);
  const p2HasMoves = hasAnyLegalMoveForPlayer(board, 2);
  const noMovesRemain = !p1HasMoves && !p2HasMoves;

  const isOver = isFull || noMovesRemain;
  let winner: Player | "draw" | null = null;

  if (isOver) {
    if (player1Score > player2Score) winner = 1;
    else if (player2Score > player1Score) winner = 2;
    else winner = "draw";
  }

  return { isOver, winner, player1Score, player2Score, totalBoxes: totalCells };
}
