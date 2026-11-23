import { GameBoard } from "../../types/board";
import { GameBox, isOneBeforeCapture, isMaturedOrphan } from "../../types/box";
import { Player } from "../../types/game";
import { TapResult } from "../../types/engine";
import { ResourceBundle } from "../../types/resources";
import { PowerGrant } from "../../types/powers";
import { cloneBoard, getBoxAt } from "../board/boardFactory";
import {
  getAdjacentBoxIds,
  isAdjacentToPlayerTerritory,
  playerHasCapturedTerritory,
  sharesBoundaryWithMultiplePlayerTerritories,
  canPlayerCaptureBox,
} from "../board/boundary";

type OwnerSnapshot = Record<string, Player | null>;

function emptyResult(board: GameBoard): TapResult {
  return {
    board,
    capturedBoxIds: [],
    opponentCapturedBoxIds: [],
    extraTurn: false,
    rewards: {},
    powerGrants: [],
    opponentRewards: {},
    opponentPowerGrants: [],
  };
}

function snapshotOwners(board: GameBoard): OwnerSnapshot {
  const snap: OwnerSnapshot = {};
  for (const [id, box] of Object.entries(board.boxes)) {
    snap[id] = box.owner;
  }
  return snap;
}

function mergeRewards(target: ResourceBundle, add: ResourceBundle): void {
  for (const key of Object.keys(add) as (keyof ResourceBundle)[]) {
    if (add[key]) target[key] = (target[key] ?? 0) + (add[key] ?? 0);
  }
}

function mergePowerGrants(target: PowerGrant[], add: PowerGrant[]): PowerGrant[] {
  const merged = [...target];
  for (const grant of add) {
    const existing = merged.find((g) => g.powerId === grant.powerId);
    if (existing) existing.quantity += grant.quantity;
    else merged.push({ ...grant });
  }
  return merged;
}

function collectRewardsForBoxes(
  board: GameBoard,
  boxIds: string[]
): { rewards: ResourceBundle; powerGrants: PowerGrant[] } {
  let rewards: ResourceBundle = {};
  let powerGrants: PowerGrant[] = [];

  for (const id of boxIds) {
    const capturedBox = board.boxes[id];
    if (!capturedBox) continue;
    if (capturedBox.rewards) mergeRewards(rewards, capturedBox.rewards);
    if (capturedBox.powerGrants) {
      powerGrants = mergePowerGrants(powerGrants, capturedBox.powerGrants);
    }
  }

  return { rewards, powerGrants };
}

function getCaptureOwner(box: GameBox, tapper: Player): Player {
  return box.frozenBy ?? tapper;
}

/** Which player absorbs a max-count orphan based on bordering captured land */
function getOrphanAbsorbingPlayer(board: GameBoard, box: GameBox): Player | null {
  if (box.frozenBy !== null) return box.frozenBy;

  let territoryOwner: Player | null = null;

  for (const neighborId of getAdjacentBoxIds(board, box.id)) {
    const neighborOwner = board.boxes[neighborId]?.owner;
    if (neighborOwner !== 1 && neighborOwner !== 2) continue;

    if (territoryOwner !== null && territoryOwner !== neighborOwner) {
      return box.claimedBy === 1 || box.claimedBy === 2 ? box.claimedBy : null;
    }
    territoryOwner = neighborOwner;
  }

  return territoryOwner;
}

/** Auto-capture matured orphans that border any player's captured land */
function absorbOrphansAdjacentToTerritory(board: GameBoard): void {
  let changed = true;

  while (changed) {
    changed = false;
    for (const box of Object.values(board.boxes)) {
      if (!isMaturedOrphan(box)) continue;
      const owner = getOrphanAbsorbingPlayer(board, box);
      if (!owner) continue;
      box.owner = owner;
      box.claimedBy = owner;
      changed = true;
    }
  }
}

function finishTap(
  board: GameBoard,
  ownersBefore: OwnerSnapshot,
  activePlayer: Player
): TapResult {
  absorbOrphansAdjacentToTerritory(board);

  const opponent: Player = activePlayer === 1 ? 2 : 1;
  const capturedBoxIds: string[] = [];
  const opponentCapturedBoxIds: string[] = [];

  for (const [id, box] of Object.entries(board.boxes)) {
    if (ownersBefore[id] === box.owner) continue;
    if (box.owner === activePlayer) capturedBoxIds.push(id);
    else if (box.owner === opponent) opponentCapturedBoxIds.push(id);
  }

  const { rewards, powerGrants } = collectRewardsForBoxes(board, capturedBoxIds);
  const { rewards: opponentRewards, powerGrants: opponentPowerGrants } =
    collectRewardsForBoxes(board, opponentCapturedBoxIds);

  return {
    board,
    capturedBoxIds,
    opponentCapturedBoxIds,
    extraTurn: false,
    rewards,
    powerGrants,
    opponentRewards,
    opponentPowerGrants,
  };
}

function finalizeCapture(
  board: GameBoard,
  box: GameBox,
  player: Player,
  ownersBefore: OwnerSnapshot
): TapResult {
  box.count = box.captureThreshold;
  box.owner = player;
  box.claimedBy = player;
  box.frozenBy = null;
  return finishTap(board, ownersBefore, player);
}

export function executeTap(
  board: GameBoard,
  row: number,
  col: number,
  activePlayer: Player
): TapResult {
  const box = getBoxAt(board, row, col);
  if (!box) return emptyResult(board);

  const nextBoard = cloneBoard(board);
  const ownersBefore = snapshotOwners(nextBoard);
  const nextBox = nextBoard.boxes[box.id];

  // Voluntary self-attack on own captured land — reduces count and may uncapture
  if (nextBox.owner === activePlayer) {
    if (nextBox.count <= 0) return emptyResult(board);
    nextBox.count -= 1;
    if (nextBox.count < nextBox.captureThreshold) {
      nextBox.owner = null;
      nextBox.claimedBy = null;
    }
    return finishTap(nextBoard, ownersBefore, activePlayer);
  }

  if (nextBox.owner !== null) return emptyResult(board);

  // Matured orphan — tappable; reduces count by 1 (frozen plots cost 2 taps in session)
  if (isMaturedOrphan(nextBox)) {
    nextBox.count -= 1;
    return finishTap(nextBoard, ownersBefore, activePlayer);
  }

  nextBox.claimedBy = nextBox.frozenBy ?? activePlayer;

  if (isOneBeforeCapture(nextBox)) {
    const canCaptureNow = canPlayerCaptureBox(nextBoard, nextBox.id, activePlayer);

    if (canCaptureNow) {
      return finalizeCapture(
        nextBoard,
        nextBox,
        getCaptureOwner(nextBox, activePlayer),
        ownersBefore
      );
    }

    nextBox.count = nextBox.captureThreshold;
    nextBox.owner = null;
    return finishTap(nextBoard, ownersBefore, activePlayer);
  }

  nextBox.count += 1;
  return finishTap(nextBoard, ownersBefore, activePlayer);
}

/** Neutral plot sharing boundary with at least TWO distinct captured plots of player — can be frozen with two taps (no count increase). */
export function canFreezeBox(
  board: GameBoard,
  row: number,
  col: number,
  player: Player
): boolean {
  const box = getBoxAt(board, row, col);
  if (!box) return false;
  if (box.owner !== null) return false;
  if (isMaturedOrphan(box)) return false;
  if (box.frozenBy !== null) return false;
  if (!playerHasCapturedTerritory(board, player)) return false;
  return sharesBoundaryWithMultiplePlayerTerritories(board, box.id, player);
}

export function executeFreeze(
  board: GameBoard,
  row: number,
  col: number,
  player: Player
): TapResult {
  const box = getBoxAt(board, row, col);
  if (!box || !canFreezeBox(board, row, col, player)) return emptyResult(board);

  const nextBoard = cloneBoard(board);
  const ownersBefore = snapshotOwners(nextBoard);
  nextBoard.boxes[box.id].frozenBy = player;
  return finishTap(nextBoard, ownersBefore, player);
}

/** Taps consumed to freeze one boundary-adjacent neutral plot */
export const FREEZE_TAP_COST = 2;

/** Neutral plot locked by a freeze — either player may tap it for +1 at double tap cost */
export function isFrozenPlot(box: GameBox): boolean {
  return box.owner === null && box.frozenBy !== null;
}

/** Plot frozen by this player */
export function isOwnFrozenPlot(box: GameBox, player: Player): boolean {
  return isFrozenPlot(box) && box.frozenBy === player;
}

export function getTapCostForBox(box: GameBox, _player: Player): number {
  return isFrozenPlot(box) ? FREEZE_TAP_COST : 1;
}

export function canInitiateFreezeTurn(turn: {
  tapsRemaining: number;
  normalTapUsedThisTurn: boolean;
}): boolean {
  return !turn.normalTapUsedThisTurn && turn.tapsRemaining >= FREEZE_TAP_COST;
}

export function isCaptureMove(board: GameBoard, row: number, col: number, player: Player): boolean {
  const box = getBoxAt(board, row, col);
  if (!box || box.owner !== null) return false;
  if (!isOneBeforeCapture(box)) return false;

  const canTriggerCapture = canPlayerCaptureBox(board, box.id, player);
  if (!canTriggerCapture) return false;

  if (box.frozenBy !== null) {
    return box.frozenBy === player;
  }

  return true;
}
