import { GameBoard } from "../../types/board";
import { GameBox, Coord, Direction } from "../../types/box";
import { Player } from "../../types/game";
import { cloneBoard } from "./boardFactory";
import { canPlayerSpawnAt, updateTerritoryUnlocks } from "./territoryRules";

export interface LegalMove {
  type: "spawn" | "expand";
  row?: number;
  col?: number;
  boxId?: string;
  direction?: Direction;
}

/**
 * Get cells in the 1-layer extrusion strip for a block in a direction.
 */
export function getExtrusionStripCells(
  box: GameBox,
  direction: Direction
): Coord[] {
  const { row, col, width, height } = box;
  const cells: Coord[] = [];

  switch (direction) {
    case "up": {
      const targetRow = row - 1;
      for (let c = col; c < col + width; c++) {
        cells.push({ row: targetRow, col: c });
      }
      break;
    }
    case "down": {
      const targetRow = row + height;
      for (let c = col; c < col + width; c++) {
        cells.push({ row: targetRow, col: c });
      }
      break;
    }
    case "left": {
      const targetCol = col - 1;
      for (let r = row; r < row + height; r++) {
        cells.push({ row: r, col: targetCol });
      }
      break;
    }
    case "right": {
      const targetCol = col + width;
      for (let r = row; r < row + height; r++) {
        cells.push({ row: r, col: targetCol });
      }
      break;
    }
  }
  return cells;
}

/**
 * Check if a block can expand in a given direction:
 * - Block must belong to the player.
 * - ALL target cells in the new edge strip must be within grid boundaries.
 * - ALL target cells in the new edge strip must be completely empty:
 *   not occupied by opponent blocks AND not occupied by player's own separate blocks.
 * - No partial/half growth: if ANY cell in the strip is blocked or out of bounds, the move is ILLEGAL.
 */
export function canExpandBlock(
  board: GameBoard,
  boxId: string,
  direction: Direction,
  player: Player
): boolean {
  const box = board.boxes[boxId];
  if (!box || box.owner !== player) return false;

  const strip = getExtrusionStripCells(box, direction);
  if (strip.length === 0) return false;

  for (const cell of strip) {
    if (
      cell.row < 0 ||
      cell.row >= board.rows ||
      cell.col < 0 ||
      cell.col >= board.cols
    ) {
      return false; // Out of bounds
    }
    if (board.cellMap[cell.row][cell.col] !== null) {
      return false; // Occupied! Collision rule: cannot half grow or grow in occupied cells
    }
  }

  return true;
}

/**
 * Get all legal expansion directions for a block.
 */
export function getValidDirectionsForBlock(
  board: GameBoard,
  boxId: string,
  player: Player
): Direction[] {
  const directions: Direction[] = ["up", "down", "left", "right"];
  return directions.filter((dir) => canExpandBlock(board, boxId, dir, player));
}

/**
 * Execute spawn action: places a new 1x1 block of the player's color.
 * Consumes 1 action.
 */
export function executeSpawnBlock(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  blockColor?: string
): { success: boolean; board: GameBoard; boxId?: string } {
  if (!canPlayerSpawnAt(board, row, col, player)) {
    return { success: false, board };
  }

  const nextBoard = cloneBoard(board);
  const boxId = `blk-${player}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const newBox: GameBox = {
    id: boxId,
    row,
    col,
    width: 1,
    height: 1,
    size: 1,
    captureThreshold: 1,
    cells: [{ row, col }],
    anchor: { row, col },
    shape: "single",
    count: 1,
    owner: player,
    claimedBy: player,
    frozenBy: null,
    player,
    baseColor: blockColor || (player === 1 ? "#2563EB" : "#EA580C"),
  };

  nextBoard.boxes[boxId] = newBox;
  nextBoard.cellMap[row][col] = boxId;

  // Update territory unlocks
  updateTerritoryUnlocks(nextBoard);

  return { success: true, board: nextBoard, boxId };
}

/**
 * Execute extrusion action: expands an existing rectangular block in a direction by 1 layer.
 * Consumes 1 action.
 */
export function executeExpandBlock(
  board: GameBoard,
  boxId: string,
  direction: Direction,
  player: Player
): { success: boolean; board: GameBoard; addedCells: Coord[] } {
  if (!canExpandBlock(board, boxId, direction, player)) {
    return { success: false, board, addedCells: [] };
  }

  const nextBoard = cloneBoard(board);
  const box = nextBoard.boxes[boxId];
  const strip = getExtrusionStripCells(box, direction);

  // Update bounding box
  switch (direction) {
    case "up":
      box.row -= 1;
      box.height += 1;
      break;
    case "down":
      box.height += 1;
      break;
    case "left":
      box.col -= 1;
      box.width += 1;
      break;
    case "right":
      box.width += 1;
      break;
  }

  box.anchor = { row: box.row, col: box.col };
  box.size = box.width * box.height;
  box.count = box.size;
  box.captureThreshold = box.size;

  // Recompute cells
  const newCells: Coord[] = [];
  for (let r = box.row; r < box.row + box.height; r++) {
    for (let c = box.col; c < box.col + box.width; c++) {
      newCells.push({ row: r, col: c });
      nextBoard.cellMap[r][c] = boxId;
    }
  }
  box.cells = newCells;

  // Update territory unlocks (crossing midline)
  updateTerritoryUnlocks(nextBoard);

  return { success: true, board: nextBoard, addedCells: strip };
}

/**
 * Get all legal moves for a player (both spawning and expanding).
 */
export function getAllLegalMoves(board: GameBoard, player: Player): LegalMove[] {
  const moves: LegalMove[] = [];

  // 1. All valid spawn moves
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (canPlayerSpawnAt(board, r, c, player)) {
        moves.push({ type: "spawn", row: r, col: c });
      }
    }
  }

  // 2. All valid extrusion moves
  const directions: Direction[] = ["up", "down", "left", "right"];
  for (const box of Object.values(board.boxes)) {
    if (box.owner !== player) continue;
    for (const dir of directions) {
      if (canExpandBlock(board, box.id, dir, player)) {
        moves.push({ type: "expand", boxId: box.id, direction: dir });
      }
    }
  }

  return moves;
}

/**
 * Fast check: does the player have at least one legal move?
 */
export function hasAnyLegalMoveForPlayer(board: GameBoard, player: Player): boolean {
  // Can spawn anywhere?
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (canPlayerSpawnAt(board, r, c, player)) return true;
    }
  }

  // Can expand any block?
  const directions: Direction[] = ["up", "down", "left", "right"];
  for (const box of Object.values(board.boxes)) {
    if (box.owner !== player) continue;
    for (const dir of directions) {
      if (canExpandBlock(board, box.id, dir, player)) return true;
    }
  }

  return false;
}
