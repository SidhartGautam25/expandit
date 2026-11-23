import { BoardState, Player } from "../types/game";
import { getOrthogonalNeighbors } from "../utils/arrayUtils";

/**
 * Finds all orthogonally connected tiles with count === 2 starting from (startRow, startCol).
 * This is used for synchronous simulation (such as in AI simulation).
 */
export function findConnectedThrees(
  grid: BoardState,
  startRow: number,
  startCol: number
): { row: number; col: number }[] {
  const connected: { row: number; col: number }[] = [];
  const queue: { row: number; col: number }[] = [];
  const visited = new Set<string>();

  const key = (r: number, c: number) => `${r},${c}`;

  // Start tile must be count === 2
  if (grid[startRow][startCol].count === 2) {
    queue.push({ row: startRow, col: startCol });
    visited.add(key(startRow, startCol));
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    connected.push(curr);

    const neighbors = getOrthogonalNeighbors(curr.row, curr.col, grid.length);
    for (const [nR, nC] of neighbors) {
      const tileKey = key(nR, nC);
      if (!visited.has(tileKey) && grid[nR][nC].count === 2) {
        visited.add(tileKey);
        queue.push({ row: nR, col: nC });
      }
    }
  }

  return connected;
}

/**
 * Groups connected count === 2 tiles into sequential "waves" (BFS layers)
 * starting from the clicked tile (which must be count === 2).
 */
export function findCascadeWaves(
  grid: BoardState,
  startRow: number,
  startCol: number
): { row: number; col: number }[][] {
  if (grid[startRow][startCol].count !== 2) {
    return [];
  }

  const waves: { row: number; col: number }[][] = [];
  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  let currentWave: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  visited.add(key(startRow, startCol));

  while (currentWave.length > 0) {
    waves.push(currentWave);
    const nextWave: { row: number; col: number }[] = [];

    for (const cell of currentWave) {
      const neighbors = getOrthogonalNeighbors(cell.row, cell.col, grid.length);
      for (const [nR, nC] of neighbors) {
        const tileKey = key(nR, nC);
        if (!visited.has(tileKey) && grid[nR][nC].count === 2) {
          visited.add(tileKey);
          nextWave.push({ row: nR, col: nC });
        }
      }
    }
    currentWave = nextWave;
  }

  return waves;
}

/**
 * Pure function to apply a cascade synchronously.
 * Sets the count of these coordinates to 3 and updates their owner.
 */
export function applyCascade(
  grid: BoardState,
  coords: { row: number; col: number }[],
  owner: Player
): BoardState {
  for (const { row, col } of coords) {
    grid[row][col].count = 3;
    grid[row][col].owner = owner;
  }
  return grid;
}
