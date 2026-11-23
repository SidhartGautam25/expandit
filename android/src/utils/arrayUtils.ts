import { BoardState } from "../types/game";

/**
 * Checks if coordinates are within the board bounds.
 */
export function isValidCoord(row: number, col: number, gridSize: number): boolean {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

/**
 * Returns valid orthogonal neighbors (Up, Down, Left, Right) for a cell.
 */
export function getOrthogonalNeighbors(
  row: number,
  col: number,
  gridSize: number
): [number, number][] {
  const directions = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1],  // Right
  ];

  const neighbors: [number, number][] = [];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (isValidCoord(nr, nc, gridSize)) {
      neighbors.push([nr, nc]);
    }
  }

  return neighbors;
}

/**
 * Deep clones the 2D grid matrix immutably.
 */
export function cloneGrid(grid: BoardState): BoardState {
  return grid.map((row) =>
    row.map((tile) => ({
      ...tile,
    }))
  );
}

/**
 * Converts a flat index (0-35) to 2D row and column coordinates.
 */
export function indexToCoord(index: number, gridSize: number): { row: number; col: number } {
  return {
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  };
}

/**
 * Converts 2D row and column coordinates to a flat index.
 */
export function coordToIndex(row: number, col: number, gridSize: number): number {
  return row * gridSize + col;
}
