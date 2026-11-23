import { GameBoard } from "../../types/board";
import { GameBox, Coord } from "../../types/box";
import { isSameBoxCell } from "./boardFactory";

export interface CellLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BoardMetrics {
  cellSize: number;
  gap: number;
  padding: number;
}

export function createBoardMetrics(
  cellSize: number,
  gap = 5,
  padding = 8
): BoardMetrics {
  return { cellSize, gap, padding };
}

export function getBoardContentSize(
  metrics: BoardMetrics,
  cols: number,
  rows: number
): { width: number; height: number } {
  const { cellSize, gap, padding } = metrics;
  return {
    width: padding * 2 + cols * cellSize + gap * Math.max(cols - 1, 0),
    height: padding * 2 + rows * cellSize + gap * Math.max(rows - 1, 0),
  };
}

/**
 * Fit a board inside a viewport. For tall boards, `preferWidthCellSize` keeps
 * cell size tied to column width (same 1×1 size as square boards) when height allows.
 */
export function fitBoardLayout(
  maxWidth: number,
  maxHeight: number,
  cols: number,
  rows: number,
  options: {
    padding?: number;
    gap?: number;
    preferWidthCellSize?: boolean;
  } = {}
): { metrics: BoardMetrics; width: number; height: number } {
  const padding = options.padding ?? 8;
  const gap = options.gap ?? 5;
  const innerW = maxWidth - padding * 2;
  const innerH = maxHeight - padding * 2;
  const cellFromWidth = (innerW - gap * Math.max(cols - 1, 0)) / cols;
  const cellFromHeight = (innerH - gap * Math.max(rows - 1, 0)) / rows;

  let cellSize = Math.min(cellFromWidth, cellFromHeight);
  if (options.preferWidthCellSize && rows > cols) {
    const widthBasedHeight = getBoardContentSize(
      createBoardMetrics(cellFromWidth, gap, padding),
      cols,
      rows
    ).height;
    if (widthBasedHeight <= maxHeight) {
      cellSize = cellFromWidth;
    }
  }

  const metrics = createBoardMetrics(cellSize, gap, padding);
  const size = getBoardContentSize(metrics, cols, rows);
  return { metrics, width: size.width, height: size.height };
}

export function getBoardMetrics(
  boardSize: number,
  cols: number,
  rows: number,
  padding = 8,
  gap = 5
): BoardMetrics {
  const inner = boardSize - padding * 2;
  const cellSize = (inner - gap * (cols - 1)) / cols;
  return { cellSize, gap, padding };
}

export function getCellLayout(
  row: number,
  col: number,
  metrics: BoardMetrics
): CellLayout {
  const { cellSize, gap, padding } = metrics;
  return {
    left: padding + col * (cellSize + gap),
    top: padding + row * (cellSize + gap),
    width: cellSize,
    height: cellSize,
  };
}

/**
 * Extend fill rects across internal grid gaps so same-box cells look like one blob.
 */
export function getCellFillLayout(
  board: GameBoard,
  box: GameBox,
  cell: Coord,
  metrics: BoardMetrics
): CellLayout {
  const base = getCellLayout(cell.row, cell.col, metrics);
  const { gap } = metrics;
  let { left, top, width, height } = base;

  if (isSameBoxCell(board, cell.row, cell.col - 1, box.id)) {
    left -= gap;
    width += gap;
  }
  if (isSameBoxCell(board, cell.row, cell.col + 1, box.id)) {
    width += gap;
  }
  if (isSameBoxCell(board, cell.row - 1, cell.col, box.id)) {
    top -= gap;
    height += gap;
  }
  if (isSameBoxCell(board, cell.row + 1, cell.col, box.id)) {
    height += gap;
  }

  // Extra overlap hides sub-pixel seams between merged cells
  const seam = 3;
  if (isSameBoxCell(board, cell.row, cell.col - 1, box.id)) {
    left -= seam;
    width += seam;
  }
  if (isSameBoxCell(board, cell.row, cell.col + 1, box.id)) {
    width += seam;
  }
  if (isSameBoxCell(board, cell.row - 1, cell.col, box.id)) {
    top -= seam;
    height += seam;
  }
  if (isSameBoxCell(board, cell.row + 1, cell.col, box.id)) {
    height += seam;
  }

  return { left, top, width, height };
}

/**
 * Merged cell layout for overlays — bridges gaps without the extra seam overlap
 * that causes visible cross-lines when semi-transparent layers stack.
 */
export function getCellOverlayLayout(
  board: GameBoard,
  box: GameBox,
  cell: Coord,
  metrics: BoardMetrics
): CellLayout {
  const base = getCellLayout(cell.row, cell.col, metrics);
  const { gap } = metrics;
  let { left, top, width, height } = base;
  const halfGap = gap / 2;

  if (isSameBoxCell(board, cell.row, cell.col - 1, box.id)) {
    left -= halfGap;
    width += halfGap;
  }
  if (isSameBoxCell(board, cell.row, cell.col + 1, box.id)) {
    width += halfGap;
  }
  if (isSameBoxCell(board, cell.row - 1, cell.col, box.id)) {
    top -= halfGap;
    height += halfGap;
  }
  if (isSameBoxCell(board, cell.row + 1, cell.col, box.id)) {
    height += halfGap;
  }

  return { left, top, width, height };
}

/** Bounding box of the merged shape (for optional whole-shape effects). */
export function getBoxUnionBounds(
  board: GameBoard,
  box: GameBox,
  metrics: BoardMetrics
): CellLayout {
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const cell of box.cells) {
    const f = getCellFillLayout(board, box, cell, metrics);
    minL = Math.min(minL, f.left);
    minT = Math.min(minT, f.top);
    maxR = Math.max(maxR, f.left + f.width);
    maxB = Math.max(maxB, f.top + f.height);
  }
  return { left: minL, top: minT, width: maxR - minL, height: maxB - minT };
}

/** Corner radii for a single overlay spanning the whole merged plot shape. */
export function getBoxUnionCornerRadius(
  board: GameBoard,
  box: GameBox,
  metrics: BoardMetrics
): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} {
  const union = getBoxUnionBounds(board, box, metrics);
  const eps = 0.5;
  let tl = 0;
  let tr = 0;
  let bl = 0;
  let br = 0;

  for (const cell of box.cells) {
    const fill = getCellFillLayout(board, box, cell, metrics);
    const radii = getCellCornerRadius(board, box, cell, metrics);
    const fillRight = fill.left + fill.width;
    const fillBottom = fill.top + fill.height;
    const unionRight = union.left + union.width;
    const unionBottom = union.top + union.height;

    if (Math.abs(fill.left - union.left) < eps && Math.abs(fill.top - union.top) < eps) {
      tl = Math.max(tl, radii.borderTopLeftRadius);
    }
    if (Math.abs(fillRight - unionRight) < eps && Math.abs(fill.top - union.top) < eps) {
      tr = Math.max(tr, radii.borderTopRightRadius);
    }
    if (Math.abs(fill.left - union.left) < eps && Math.abs(fillBottom - unionBottom) < eps) {
      bl = Math.max(bl, radii.borderBottomLeftRadius);
    }
    if (Math.abs(fillRight - unionRight) < eps && Math.abs(fillBottom - unionBottom) < eps) {
      br = Math.max(br, radii.borderBottomRightRadius);
    }
  }

  return {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomLeftRadius: bl,
    borderBottomRightRadius: br,
  };
}

/**
 * Expand outward on external sides only — creates a soft pastel rim (not black).
 */
export function getCellStrokeLayout(
  board: GameBoard,
  box: GameBox,
  cell: Coord,
  metrics: BoardMetrics,
  strokeWidth: number
): CellLayout {
  const fill = getCellFillLayout(board, box, cell, metrics);
  let { left, top, width, height } = fill;

  if (!isSameBoxCell(board, cell.row - 1, cell.col, box.id)) {
    top -= strokeWidth;
    height += strokeWidth;
  }
  if (!isSameBoxCell(board, cell.row + 1, cell.col, box.id)) {
    height += strokeWidth;
  }
  if (!isSameBoxCell(board, cell.row, cell.col - 1, box.id)) {
    left -= strokeWidth;
    width += strokeWidth;
  }
  if (!isSameBoxCell(board, cell.row, cell.col + 1, box.id)) {
    width += strokeWidth;
  }

  return { left, top, width, height };
}

export const PLOT_STROKE_WIDTH = 2.5;

export function getPlotCornerRadius(metrics: BoardMetrics): number {
  return Math.min(10, metrics.cellSize * 0.2);
}

export function getCellCornerRadius(
  board: GameBoard,
  box: GameBox,
  cell: Coord,
  metrics: BoardMetrics
): {
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
} {
  const r = getPlotCornerRadius(metrics);
  const hasT = isSameBoxCell(board, cell.row - 1, cell.col, box.id);
  const hasB = isSameBoxCell(board, cell.row + 1, cell.col, box.id);
  const hasL = isSameBoxCell(board, cell.row, cell.col - 1, box.id);
  const hasR = isSameBoxCell(board, cell.row, cell.col + 1, box.id);

  return {
    borderTopLeftRadius: !hasT && !hasL ? r : 0,
    borderTopRightRadius: !hasT && !hasR ? r : 0,
    borderBottomLeftRadius: !hasB && !hasL ? r : 0,
    borderBottomRightRadius: !hasB && !hasR ? r : 0,
  };
}

export interface ShapeEdge {
  left: number;
  top: number;
  length: number;
  orientation: "horizontal" | "vertical";
  side: "top" | "bottom" | "left" | "right";
  cell: Coord;
}

/** Outer perimeter segments only — internal same-box gaps are not outlined. */
export function getBoxOutlineEdges(
  board: GameBoard,
  box: GameBox,
  metrics: BoardMetrics
): ShapeEdge[] {
  const edges: ShapeEdge[] = [];

  for (const cell of box.cells) {
    const fill = getCellFillLayout(board, box, cell, metrics);

    if (!isSameBoxCell(board, cell.row - 1, cell.col, box.id)) {
      edges.push({
        left: fill.left,
        top: fill.top,
        length: fill.width,
        orientation: "horizontal",
        side: "top",
        cell,
      });
    }
    if (!isSameBoxCell(board, cell.row + 1, cell.col, box.id)) {
      edges.push({
        left: fill.left,
        top: fill.top + fill.height,
        length: fill.width,
        orientation: "horizontal",
        side: "bottom",
        cell,
      });
    }
    if (!isSameBoxCell(board, cell.row, cell.col - 1, box.id)) {
      edges.push({
        left: fill.left,
        top: fill.top,
        length: fill.height,
        orientation: "vertical",
        side: "left",
        cell,
      });
    }
    if (!isSameBoxCell(board, cell.row, cell.col + 1, box.id)) {
      edges.push({
        left: fill.left + fill.width,
        top: fill.top,
        length: fill.height,
        orientation: "vertical",
        side: "right",
        cell,
      });
    }
  }

  return edges;
}

export type OuterCorner = "tl" | "tr" | "bl" | "br";

export interface BoxOuterCorner {
  left: number;
  top: number;
  corner: OuterCorner;
  radius: number;
}

/** Convex outer corners aligned to the plot stroke outline. */
export function getBoxOuterCorners(
  board: GameBoard,
  box: GameBox,
  metrics: BoardMetrics,
  strokeWidth = PLOT_STROKE_WIDTH
): BoxOuterCorner[] {
  const corners: BoxOuterCorner[] = [];
  const same = (r: number, c: number) => isSameBoxCell(board, r, c, box.id);

  for (const cell of box.cells) {
    const stroke = getCellStrokeLayout(board, box, cell, metrics, strokeWidth);
    const radii = getCellCornerRadius(board, box, cell, metrics);

    if (!same(cell.row - 1, cell.col) && !same(cell.row, cell.col - 1)) {
      corners.push({
        left: stroke.left,
        top: stroke.top,
        corner: "tl",
        radius: radii.borderTopLeftRadius,
      });
    }
    if (!same(cell.row - 1, cell.col) && !same(cell.row, cell.col + 1)) {
      corners.push({
        left: stroke.left + stroke.width,
        top: stroke.top,
        corner: "tr",
        radius: radii.borderTopRightRadius,
      });
    }
    if (!same(cell.row + 1, cell.col) && !same(cell.row, cell.col - 1)) {
      corners.push({
        left: stroke.left,
        top: stroke.top + stroke.height,
        corner: "bl",
        radius: radii.borderBottomLeftRadius,
      });
    }
    if (!same(cell.row + 1, cell.col) && !same(cell.row, cell.col + 1)) {
      corners.push({
        left: stroke.left + stroke.width,
        top: stroke.top + stroke.height,
        corner: "br",
        radius: radii.borderBottomRightRadius,
      });
    }
  }

  return corners;
}

/** Midpoint on an external edge — placed slightly inside the shape so it isn't clipped. */
export function getEdgeMidpoint(
  edge: ShapeEdge,
  metrics: BoardMetrics
): { left: number; top: number } {
  const inset = Math.max(6, metrics.cellSize * 0.14);
  if (edge.orientation === "horizontal") {
    return {
      left: edge.left + edge.length / 2,
      top: edge.side === "top" ? edge.top + inset : edge.top - inset,
    };
  }
  return {
    left: edge.side === "left" ? edge.left + inset : edge.left - inset,
    top: edge.top + edge.length / 2,
  };
}

/** Pick the external edge of the tapped cell for the bot dot. */
export function getBotDotEdge(
  board: GameBoard,
  box: GameBox,
  tapCell: Coord,
  metrics: BoardMetrics
): ShapeEdge | null {
  const edges = getBoxOutlineEdges(board, box, metrics).filter(
    (e) => e.cell.row === tapCell.row && e.cell.col === tapCell.col
  );
  if (edges.length === 0) return null;
  const priority = ["top", "right", "bottom", "left"];
  for (const side of priority) {
    const found = edges.find((e) => e.side === side);
    if (found) return found;
  }
  return edges[0];
}
