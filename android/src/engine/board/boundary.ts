import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";

/** Box ids that share an edge with the given box */
export function getAdjacentBoxIds(board: GameBoard, boxId: string): string[] {
  const box = board.boxes[boxId];
  if (!box) return [];

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

  return [...neighbors];
}

export function isAdjacentToBox(
  board: GameBoard,
  boxId: string,
  otherBoxId: string
): boolean {
  return getAdjacentBoxIds(board, boxId).includes(otherBoxId);
}

export function playerHasCapturedTerritory(
  board: GameBoard,
  player: Player
): boolean {
  return Object.values(board.boxes).some((box) => box.owner === player);
}

export function isAdjacentToPlayerTerritory(
  board: GameBoard,
  boxId: string,
  player: Player
): boolean {
  for (const neighborId of getAdjacentBoxIds(board, boxId)) {
    if (board.boxes[neighborId]?.owner === player) return true;
  }
  return false;
}

/** Returns the count of distinct captured plots belonging to player that border this box */
export function getAdjacentPlayerTerritoryCount(
  board: GameBoard,
  boxId: string,
  player: Player
): number {
  let count = 0;
  for (const neighborId of getAdjacentBoxIds(board, boxId)) {
    if (board.boxes[neighborId]?.owner === player) count++;
  }
  return count;
}

/** True when the plot shares a boundary with at least TWO distinct captured plots of the player */
export function sharesBoundaryWithMultiplePlayerTerritories(
  board: GameBoard,
  boxId: string,
  player: Player
): boolean {
  return getAdjacentPlayerTerritoryCount(board, boxId, player) >= 2;
}

/** Returns the number of disconnected / independent territory components owned by player */
export function getPlayerTerritoryComponentCount(
  board: GameBoard,
  player: Player
): number {
  const ownedBoxIds = new Set<string>();
  for (const box of Object.values(board.boxes)) {
    if (box.owner === player) {
      ownedBoxIds.add(box.id);
    }
  }

  if (ownedBoxIds.size === 0) return 0;

  const visited = new Set<string>();
  let components = 0;

  for (const boxId of ownedBoxIds) {
    if (visited.has(boxId)) continue;
    components++;
    const queue = [boxId];
    visited.add(boxId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighborId of getAdjacentBoxIds(board, current)) {
        if (ownedBoxIds.has(neighborId) && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  return components;
}

/**
 * Returns whether player can capture boxId.
 * Allowed if:
 * 1. The box shares a boundary with an existing territory of player (expands or merges territory), OR
 * 2. The player currently has fewer than maxTerritories (default 2) independent territories.
 */
export function canPlayerCaptureBox(
  board: GameBoard,
  boxId: string,
  player: Player,
  maxTerritories = 2
): boolean {
  if (isAdjacentToPlayerTerritory(board, boxId, player)) {
    return true;
  }
  const currentTerritories = getPlayerTerritoryComponentCount(board, player);
  return currentTerritories < maxTerritories;
}

