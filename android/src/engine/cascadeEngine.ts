/**
 * @deprecated Legacy engine — use engine/gameEngine.ts instead.
 * Kept for backward compatibility with old aiEngine.ts imports.
 */
import { BoardState, Player } from "../types/game";
import { cloneGrid } from "../utils/arrayUtils";

export interface LegacyTapResult {
  nextBoard: BoardState;
  capturedTiles: { row: number; col: number }[];
  extraTurn: boolean;
}

export function executeTap(
  grid: BoardState,
  row: number,
  col: number,
  activePlayer: Player
): LegacyTapResult {
  const nextBoard = cloneGrid(grid);
  const tile = nextBoard[row][col];

  if (tile.count >= 3) {
    return { nextBoard: grid, capturedTiles: [], extraTurn: false };
  }

  if (tile.count === 2) {
    tile.count = 3;
    tile.owner = activePlayer;
    return {
      nextBoard,
      capturedTiles: [{ row, col }],
      extraTurn: true,
    };
  }

  tile.count += 1;
  tile.owner = null;
  return { nextBoard, capturedTiles: [], extraTurn: false };
}

export function getValidMoves(
  grid: BoardState,
  _tapsRemaining: number = 2,
  _firstTapCoord: { row: number; col: number } | null = null
): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].count < 3) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

export function checkWinCondition(grid: BoardState) {
  let player1Score = 0;
  let player2Score = 0;
  const gridSize = grid.length;
  const totalTiles = gridSize * gridSize;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = grid[r][c];
      if (tile.count === 3) {
        if (tile.owner === 1) player1Score++;
        else if (tile.owner === 2) player2Score++;
      }
    }
  }

  const isOver = player1Score + player2Score === totalTiles;
  let winner: Player | "draw" | null = null;
  if (isOver) {
    if (player1Score > player2Score) winner = 1;
    else if (player2Score > player1Score) winner = 2;
    else winner = "draw";
  }

  return { isOver, winner, player1Score, player2Score, totalBoxes: totalTiles };
}
