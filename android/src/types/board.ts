import { GameBox } from "./box";

export interface GameBoard {
  rows: number;
  cols: number;
  /** boxId per cell; null = empty/unplayable */
  cellMap: (string | null)[][];
  boxes: Record<string, GameBox>;
}

export function getTotalBoxCount(board: GameBoard): number {
  return Object.keys(board.boxes).length;
}

/** Sum of box sizes — max score points on the board */
export function getTotalBoardPoints(board: GameBoard): number {
  return Object.values(board.boxes).reduce((sum, box) => sum + box.size, 0);
}
