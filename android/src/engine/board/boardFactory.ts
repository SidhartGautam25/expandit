import { GameBoard } from "../../types/board";
import { GameBox, BoxDefinition, getCaptureThreshold } from "../../types/box";
import { CampaignLevel } from "../../types/level";
import { cellsFromShape } from "./boxShapes";
import { assignBoxColors, BOX_PALETTE } from "./boxColors";

function findAnchor(cells: { row: number; col: number }[]): { row: number; col: number } {
  return cells.reduce((min, c) =>
    c.row < min.row || (c.row === min.row && c.col < min.col) ? c : min
  );
}

function createBoxFromDefinition(def: BoxDefinition): GameBox {
  const anchor = findAnchor(def.cells);
  return {
    id: def.id,
    size: def.size,
    captureThreshold: getCaptureThreshold(def.size),
    cells: def.cells,
    anchor,
    shape: def.shape,
    count: 0,
    owner: null,
    claimedBy: null,
    frozenBy: null,
    rewards: def.rewards,
    powerGrants: def.powerGrants,
    baseColor: BOX_PALETTE[0],
  };
}

export function createBoardFromLevel(
  level: CampaignLevel,
  options?: { reservedColors?: string[] }
): GameBoard {
  const cellMap: (string | null)[][] = Array.from({ length: level.rows }, () =>
    Array(level.cols).fill(null)
  );
  const boxes: Record<string, GameBox> = {};

  for (const def of level.boxes) {
    const box = createBoxFromDefinition(def);
    boxes[box.id] = box;
    for (const cell of box.cells) {
      if (cell.row >= 0 && cell.row < level.rows && cell.col >= 0 && cell.col < level.cols) {
        cellMap[cell.row][cell.col] = box.id;
      }
    }
  }

  assignBoxColors(
    { rows: level.rows, cols: level.cols, cellMap, boxes },
    options?.reservedColors ?? []
  );

  return { rows: level.rows, cols: level.cols, cellMap, boxes };
}

/** Helper to place a box at an anchor using a shape template */
export function makeBoxDef(
  id: string,
  anchor: { row: number; col: number },
  shape: import("../../types/box").BoxShapeType,
  extras?: Partial<Pick<BoxDefinition, "rewards" | "powerGrants">>
): BoxDefinition {
  const cells = cellsFromShape(anchor, shape);
  return {
    id,
    size: cells.length,
    cells,
    shape,
    ...extras,
  };
}

/** Fill a rectangular region with single-cell boxes */
export function fillGridWithSingles(
  rows: number,
  cols: number,
  prefix = "box"
): BoxDefinition[] {
  const defs: BoxDefinition[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      defs.push(makeBoxDef(`${prefix}-${r}-${c}`, { row: r, col: c }, "single"));
    }
  }
  return defs;
}

export function cloneBoard(board: GameBoard): GameBoard {
  const cellMap = board.cellMap.map((row) => [...row]);
  const boxes: Record<string, GameBox> = {};
  for (const [id, box] of Object.entries(board.boxes)) {
    boxes[id] = {
      ...box,
      cells: box.cells.map((c) => ({ ...c })),
      anchor: { ...box.anchor },
      rewards: box.rewards ? { ...box.rewards } : undefined,
      powerGrants: box.powerGrants ? [...box.powerGrants] : undefined,
      baseColor: box.baseColor,
    };
  }
  return { rows: board.rows, cols: board.cols, cellMap, boxes };
}

export function getBoxAt(
  board: GameBoard,
  row: number,
  col: number
): GameBox | null {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return null;
  const boxId = board.cellMap[row][col];
  if (!boxId) return null;
  return board.boxes[boxId] ?? null;
}

export function getCellDisplayState(
  board: GameBoard,
  row: number,
  col: number
): {
  box: GameBox | null;
  isAnchor: boolean;
  isPlayable: boolean;
} {
  const box = getBoxAt(board, row, col);
  if (!box) return { box: null, isAnchor: false, isPlayable: false };
  const isAnchor = box.anchor.row === row && box.anchor.col === col;
  return { box, isAnchor, isPlayable: true };
}

export function isSameBoxCell(
  board: GameBoard,
  row: number,
  col: number,
  boxId: string
): boolean {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return false;
  return board.cellMap[row][col] === boxId;
}

/** Tighter margins between cells of the same multi-cell box */
export function getCellMargins(
  board: GameBoard,
  row: number,
  col: number,
  boxId: string
): { marginTop: number; marginBottom: number; marginLeft: number; marginRight: number } {
  const gap = 2;
  const outer = 3;
  return {
    marginTop: isSameBoxCell(board, row - 1, col, boxId) ? 0 : outer,
    marginBottom: isSameBoxCell(board, row + 1, col, boxId) ? 0 : outer,
    marginLeft: isSameBoxCell(board, row, col - 1, boxId) ? 0 : outer,
    marginRight: isSameBoxCell(board, row, col + 1, boxId) ? 0 : outer,
  };
}

export function getRewardPreview(box: GameBox): string {
  if (!box.rewards) return "";
  const parts: string[] = [];
  if (box.rewards.money) parts.push("💵");
  if (box.rewards.gold) parts.push("🥇");
  if (box.rewards.silver) parts.push("🥈");
  return parts.join("");
}

export function getPowerPreview(box: GameBox): string {
  if (!box.powerGrants?.length) return "";
  const icons: Record<string, string> = {
    extra_tap: "⚡",
    steal: "🔄",
    destroy: "💥",
    freeze: "❄️",
  };
  return box.powerGrants.map((g) => icons[g.powerId] ?? "✨").join("");
}
