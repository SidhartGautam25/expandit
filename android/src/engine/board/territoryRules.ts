import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";

export type TerritoryZone = "player1" | "player2" | "neutral";

/**
 * Midline row divider:
 * For a board with R rows, midline = Math.floor(R / 2).
 * Top half: rows 0 .. midline - 1 (Player 1 initial territory).
 * Bottom half: rows midline .. R - 1 (Player 2 initial territory).
 */
export function getMidlineRow(rows: number): number {
  return Math.floor(rows / 2);
}

/**
 * Get the territory zone for a specific row.
 * A row is Neutral (White) if unlockedP2MinRow <= row <= unlockedP1MaxRow.
 * Otherwise:
 * - row < midline: Player 1 territory (light tint)
 * - row >= midline: Player 2 territory (light tint)
 */
export function getRowTerritoryZone(board: GameBoard, row: number): TerritoryZone {
  const midline = getMidlineRow(board.rows);
  const p1Max = board.unlockedP1MaxRow ?? (midline - 1);
  const p2Min = board.unlockedP2MinRow ?? midline;

  if (p2Min <= row && row <= p1Max) {
    return "neutral";
  }
  return row < midline ? "player1" : "player2";
}

/**
 * Check if a cell is inside the neutral zone.
 */
export function isCellInNeutralZone(board: GameBoard, row: number): boolean {
  return getRowTerritoryZone(board, row) === "neutral";
}

/**
 * Check if a player can spawn a new 1x1 block at (row, col):
 * 1. Cell must be within bounds.
 * 2. Cell must be empty (cellMap[row][col] === null).
 * 3. Cell must be in the player's own tinted territory OR in the Neutral (White) Zone.
 * 4. Player CANNOT spawn inside opponent's tinted territory.
 */
export function canPlayerSpawnAt(
  board: GameBoard,
  row: number,
  col: number,
  player: Player
): boolean {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }
  if (board.cellMap[row][col] !== null) {
    return false;
  }

  const zone = getRowTerritoryZone(board, row);
  if (zone === "neutral") {
    return true;
  }
  if (player === 1) {
    return zone === "player1";
  } else {
    return zone === "player2";
  }
}

/**
 * Update unlocked territory rows based on all current blocks on the board.
 * - When Player 1 occupies any cell in row r >= midline: unlockedP1MaxRow = max(unlockedP1MaxRow, r)
 * - When Player 2 occupies any cell in row r < midline: unlockedP2MinRow = min(unlockedP2MinRow, r)
 * Unlocked rows are monotonic (once unlocked to neutral, they never lock back).
 */
export function updateTerritoryUnlocks(board: GameBoard): void {
  const midline = getMidlineRow(board.rows);
  let p1Max = board.unlockedP1MaxRow ?? (midline - 1);
  let p2Min = board.unlockedP2MinRow ?? midline;

  for (const box of Object.values(board.boxes)) {
    if (!box.owner) continue;
    for (const cell of box.cells) {
      if (box.owner === 1 && cell.row >= midline) {
        if (cell.row > p1Max) p1Max = cell.row;
      } else if (box.owner === 2 && cell.row < midline) {
        if (cell.row < p2Min) p2Min = cell.row;
      }
    }
  }

  board.unlockedP1MaxRow = p1Max;
  board.unlockedP2MinRow = p2Min;
}
