import { GameBox } from "./box";

export interface GameBoard {
  rows: number;
  cols: number;
  /** boxId per cell; null = empty/unplayable */
  cellMap: (string | null)[][];
  boxes: Record<string, GameBox>;
  /** Furthest row into Player 2's territory reached by Player 1 (monotonic) */
  unlockedP1MaxRow: number;
  /** Furthest row into Player 1's territory reached by Player 2 (monotonic) */
  unlockedP2MinRow: number;
}

export function getTotalBoxCount(board: GameBoard): number {
  return Object.keys(board.boxes).length;
}

/** Sum of all captured cell points on the board */
export function getTotalBoardPoints(board: GameBoard): number {
  return board.rows * board.cols;
}
