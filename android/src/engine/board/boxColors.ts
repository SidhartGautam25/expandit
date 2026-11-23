import { GameBoard } from "../../types/board";
import {
  BOX_PALETTE,
  BOARD_MIX_RGB,
  COLORS,
  getCapturedCountTextColor,
  getCapturedStrokeColor,
  hexToRgb,
  lightenColor,
} from "../../constants/theme";

export { BOX_PALETTE, getCapturedStrokeColor, getCapturedCountTextColor, lightenColor, hexToRgb };

function getAdjacentBoxIds(board: GameBoard, boxId: string): Set<string> {
  const box = board.boxes[boxId];
  if (!box) return new Set();
  const neighbors = new Set<string>();
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const cell of box.cells) {
    for (const [dr, dc] of dirs) {
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr < 0 || nr >= board.rows || nc < 0 || nc >= board.cols) continue;
      const neighborId = board.cellMap[nr][nc];
      if (neighborId && neighborId !== boxId) neighbors.add(neighborId);
    }
  }
  return neighbors;
}

function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase().replace("#", "");
}

/** Greedy graph coloring — balances usage of all light pastel colors so classic boards feature rich multi-color variety */
export function assignBoxColors(
  board: GameBoard,
  reservedColors: string[] = []
): void {
  const reserved = new Set(reservedColors.map(normalizeHex));
  const plotPalette = BOX_PALETTE.filter((c) => !reserved.has(normalizeHex(c)));
  const colors =
    plotPalette.length > 0
      ? plotPalette
      : BOX_PALETTE.filter((c, i, arr) => arr.indexOf(c) === i);

  const shuffledColors = [...colors];
  for (let i = shuffledColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
  }

  const boxIds = Object.keys(board.boxes).sort();
  const assigned: Record<string, string> = {};
  const colorUsageCount: Record<string, number> = {};

  for (const boxId of boxIds) {
    const usedByNeighbors = new Set<string>();
    for (const neighborId of getAdjacentBoxIds(board, boxId)) {
      if (assigned[neighborId]) usedByNeighbors.add(assigned[neighborId]);
    }

    const availableNotUsed = shuffledColors.filter(
      (c) => !usedByNeighbors.has(c) && !reserved.has(normalizeHex(c))
    );

    let chosenColor: string;

    if (availableNotUsed.length > 0) {
      // Prioritize colors used the LEAST so far to distribute all beautiful colors across the grid!
      availableNotUsed.sort(
        (a, b) => (colorUsageCount[a] ?? 0) - (colorUsageCount[b] ?? 0)
      );
      chosenColor = availableNotUsed[0];
    } else {
      const fallbackAvailable = shuffledColors.filter(
        (c) => !usedByNeighbors.has(c)
      );
      if (fallbackAvailable.length > 0) {
        fallbackAvailable.sort(
          (a, b) => (colorUsageCount[a] ?? 0) - (colorUsageCount[b] ?? 0)
        );
        chosenColor = fallbackAvailable[0];
      } else {
        chosenColor =
          shuffledColors[boxIds.indexOf(boxId) % shuffledColors.length];
      }
    }

    colorUsageCount[chosenColor] = (colorUsageCount[chosenColor] ?? 0) + 1;
    assigned[boxId] = chosenColor;
    board.boxes[boxId].baseColor = chosenColor;
  }
}

function mixRgb(hex: string, amount: number, bg = BOARD_MIX_RGB): string {
  const { r, g, b } = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, amount));
  return `rgb(${Math.round(r * t + bg.r * (1 - t))}, ${Math.round(g * t + bg.g * (1 - t))}, ${Math.round(b * t + bg.b * (1 - t))})`;
}

export function getBoxFillColor(
  baseColor: string,
  count: number,
  maxCount: number,
  isCaptured: boolean,
  playerColor: string
): string {
  if (isCaptured) return playerColor;
  if (count === 0) return mixRgb(baseColor, 0.85);
  const progress = count / Math.max(maxCount - 1, 1);
  return mixRgb(baseColor, 0.85 + progress * 0.15);
}

export function getBoxBorderColor(
  baseColor: string,
  isCaptured: boolean,
  playerColor: string,
  isDanger: boolean
): string {
  if (isCaptured) return getCapturedStrokeColor(playerColor);
  if (isDanger) return COLORS.dangerBorder;
  return baseColor;
}
