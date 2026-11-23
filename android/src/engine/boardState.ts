import { BoardState, TileState } from "../types/game";
import { GRID_SIZE } from "../constants/grid";

/**
 * Creates an initial 6x6 (or custom size) board state with counts at 0 and owner as null.
 */
export function createInitialBoard(gridSize: number = GRID_SIZE): BoardState {
  const board: BoardState = [];
  for (let r = 0; r < gridSize; r++) {
    const row: TileState[] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        count: 0,
        owner: null,
      });
    }
    board.push(row);
  }
  return board;
}
