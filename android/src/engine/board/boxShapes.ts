import { Coord, BoxShapeType } from "../../types/box";

export interface ShapeTemplate {
  id: BoxShapeType;
  /** Cell offsets relative to anchor (0,0) */
  offsets: Coord[];
}

export const SHAPE_TEMPLATES: Record<BoxShapeType, ShapeTemplate> = {
  single: { id: "single", offsets: [{ row: 0, col: 0 }] },
  horizontal: {
    id: "horizontal",
    offsets: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ],
  },
  horizontal3: {
    id: "horizontal3",
    offsets: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
  },
  vertical: {
    id: "vertical",
    offsets: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ],
  },
  "l-shape": {
    id: "l-shape",
    offsets: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
  },
  zigzag: {
    id: "zigzag",
    offsets: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ],
  },
  square: {
    id: "square",
    offsets: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
  },
  block3x2: {
    id: "block3x2",
    offsets: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
  },
};

export function cellsFromShape(
  anchor: Coord,
  shape: BoxShapeType
): Coord[] {
  const template = SHAPE_TEMPLATES[shape];
  return template.offsets.map((o) => ({
    row: anchor.row + o.row,
    col: anchor.col + o.col,
  }));
}

export function inferShape(size: number, cells: Coord[]): BoxShapeType {
  if (size === 1) return "single";
  if (size === 2) {
    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
    return sorted[0].row === sorted[1].row ? "horizontal" : "vertical";
  }
  if (size === 3) {
    const rows = new Set(cells.map((c) => c.row));
    const cols = new Set(cells.map((c) => c.col));
    if (rows.size === 1 && cols.size === 3) return "horizontal3";
    return rows.size === 2 ? "zigzag" : "horizontal";
  }
  if (size === 4) return "square";
  if (size === 6) return "block3x2";
  return "single";
}
