import { Coord } from "../types/box";
import { GameBoard } from "../types/board";
import { FREEZE_TAP_COST } from "../engine/rules/tapRules";

export interface TurnMoveRecord {
  row: number;
  col: number;
  tapCost: number;
  kind: "tap" | "freeze";
}

function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

function dedupeCoords(moves: Coord[], max = 2): Coord[] {
  const unique: Coord[] = [];
  const seen = new Set<string>();
  for (const move of moves) {
    const key = coordKey(move);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(move);
    if (unique.length >= max) break;
  }
  return unique;
}

/**
 * Which plots to highlight after a completed turn:
 * - Freeze, or a single frozen-plot tap (2 tap cost) → 1 plot
 * - Two normal 1-tap actions → both plots
 */
export function resolveTurnHighlightCoords(
  records: TurnMoveRecord[]
): Coord[] {
  if (records.length === 0) return [];

  const spentFullTurnOnOne =
    records.length === 1 &&
    (records[0].kind === "freeze" || records[0].tapCost >= FREEZE_TAP_COST);

  if (spentFullTurnOnOne) {
    return [{ row: records[0].row, col: records[0].col }];
  }

  return dedupeCoords(
    records.map((record) => ({ row: record.row, col: record.col })),
    2
  );
}

/** Fallback when only legacy coord arrays are available (saved games). */
export function getTurnHighlightCoords(moves: Coord[]): Coord[] {
  if (moves.length === 0) return [];
  if (moves.length === 1) return moves;
  return dedupeCoords(moves, 2);
}

export function getLastMoveBoxIds(
  board: GameBoard,
  moves: Coord[]
): Set<string> {
  const ids = new Set<string>();
  for (const coord of getTurnHighlightCoords(moves)) {
    const id = board.cellMap[coord.row]?.[coord.col];
    if (id) ids.add(id);
  }
  return ids;
}
