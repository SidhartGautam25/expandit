import { GameBoard } from "../../types/board";
import { GameBox, isDangerPlot, isMaturedOrphan } from "../../types/box";
import { Player } from "../../types/game";
import { ValidMove } from "../../types/engine";
import { getBoxAt } from "../board/boardFactory";
import { isAdjacentToPlayerTerritory } from "../board/boundary";
import { canFreezeBox, canInitiateFreezeTurn, getTapCostForBox } from "./tapRules";

export interface MoveContext {
  activePlayer: Player;
  tapsRemaining: number;
  tapsPerTurn: number;
  excludedBoxId: string | null;
  dangerTapCount: number;
  dangerTerritoryLinked: boolean;
}

function canAffordTapOnBox(box: GameBox, ctx: MoveContext): boolean {
  return getTapCostForBox(box, ctx.activePlayer) <= ctx.tapsRemaining;
}

function isNeutralInPlay(box: GameBox): boolean {
  return box.owner === null && box.count < box.captureThreshold;
}

function violatesDangerTapLimit(
  board: GameBoard,
  boxId: string,
  ctx: MoveContext
): boolean {
  const box = board.boxes[boxId];
  if (!box || !isDangerPlot(box)) return false;

  if (ctx.dangerTapCount >= 2) return true;
  if (ctx.dangerTapCount === 0) return false;

  const bordersTerritory = isAdjacentToPlayerTerritory(
    board,
    boxId,
    ctx.activePlayer
  );

  return !(ctx.dangerTerritoryLinked || bordersTerritory);
}

function isSameBoxTwiceBlocked(boxId: string, ctx: MoveContext): boolean {
  return (
    ctx.tapsRemaining < ctx.tapsPerTurn &&
    ctx.excludedBoxId !== null &&
    boxId === ctx.excludedBoxId
  );
}

function isValidNeutralTarget(
  board: GameBoard,
  box: GameBox,
  ctx: MoveContext
): boolean {
  if (!isNeutralInPlay(box)) return false;
  if (!canAffordTapOnBox(box, ctx)) return false;
  if (violatesDangerTapLimit(board, box.id, ctx)) return false;
  if (isSameBoxTwiceBlocked(box.id, ctx)) return false;
  return true;
}

function isValidMaturedOrphanTarget(box: GameBox, ctx: MoveContext): boolean {
  if (!isMaturedOrphan(box)) return false;
  if (!canAffordTapOnBox(box, ctx)) return false;
  if (isSameBoxTwiceBlocked(box.id, ctx)) return false;
  return true;
}

function isValidSelfAttackTarget(box: GameBox, ctx: MoveContext): boolean {
  if (box.owner !== ctx.activePlayer || box.count <= 0) return false;
  if (!canAffordTapOnBox(box, ctx)) return false;
  if (isSameBoxTwiceBlocked(box.id, ctx)) return false;
  return true;
}

function collectSelfAttackMoves(board: GameBoard, ctx: MoveContext): ValidMove[] {
  const moves: ValidMove[] = [];
  for (const box of Object.values(board.boxes)) {
    if (!isValidSelfAttackTarget(box, ctx)) continue;
    moves.push({ row: box.anchor.row, col: box.anchor.col, boxId: box.id });
  }
  return moves;
}

function collectNeutralMoves(board: GameBoard, ctx: MoveContext): ValidMove[] {
  const seen = new Set<string>();
  const moves: ValidMove[] = [];

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const box = getBoxAt(board, r, c);
      if (!box || seen.has(box.id)) continue;
      if (!isValidNeutralTarget(board, box, ctx)) continue;
      seen.add(box.id);
      moves.push({ row: r, col: c, boxId: box.id });
    }
  }

  return moves;
}

function collectMaturedOrphanMoves(board: GameBoard, ctx: MoveContext): ValidMove[] {
  const moves: ValidMove[] = [];
  for (const box of Object.values(board.boxes)) {
    if (!isValidMaturedOrphanTarget(box, ctx)) continue;
    moves.push({ row: box.anchor.row, col: box.anchor.col, boxId: box.id });
  }
  return moves;
}

export function createMoveContext(
  activePlayer: Player,
  turn: {
    tapsRemaining: number;
    tapsPerTurn: number;
    firstTapBoxId: string | null;
    dangerTapCount: number;
    dangerTerritoryLinked: boolean;
  }
): MoveContext {
  return {
    activePlayer,
    tapsRemaining: turn.tapsRemaining,
    tapsPerTurn: turn.tapsPerTurn,
    excludedBoxId: turn.firstTapBoxId,
    dangerTapCount: turn.dangerTapCount,
    dangerTerritoryLinked: turn.dangerTerritoryLinked,
  };
}

import { canPlayerSpawnAt } from "../board/territoryRules";
import { hasAnyLegalMoveForPlayer } from "../board/blockEngine";

/** Shared turn snapshot for player + bot move validation. */
export interface TurnRuleState {
  tapsRemaining: number;
  tapsPerTurn: number;
  firstTapBoxId: string | null;
  dangerTapCount: number;
  dangerTerritoryLinked: boolean;
  normalTapUsedThisTurn: boolean;
}

/**
 * Single gate for tap moves — used by UI, session execution, and bot AI.
 * Covers spawning on valid cells and selecting/interacting with own blocks.
 */
export function isValidTapAction(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  turn: TurnRuleState
): boolean {
  if (turn.tapsRemaining <= 0) return false;
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return false;

  const boxId = board.cellMap[row]?.[col];
  if (!boxId) {
    // Empty cell: check if spawn is valid
    return canPlayerSpawnAt(board, row, col, player);
  }

  // Occupied cell: valid if owned by the active player
  const box = board.boxes[boxId];
  return box?.owner === player;
}

/**
 * Single gate for freeze moves — used by UI, session execution, and bot AI.
 */
export function isValidFreezeTarget(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  turn: Pick<TurnRuleState, "tapsRemaining" | "normalTapUsedThisTurn">
): boolean {
  if (!canInitiateFreezeTurn(turn)) return false;
  return canFreezeBox(board, row, col, player);
}

/**
 * Valid tap targets: neutral plots, matured orphans, and own captured land (always).
 */
export function getValidMoves(board: GameBoard, ctx: MoveContext): ValidMove[] {
  const seen = new Set<string>();
  const moves: ValidMove[] = [];

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (canPlayerSpawnAt(board, r, c, ctx.activePlayer)) {
        moves.push({ row: r, col: c, boxId: `empty-${r}-${c}` });
      }
    }
  }

  for (const box of Object.values(board.boxes)) {
    if (box.owner === ctx.activePlayer && !seen.has(box.id)) {
      seen.add(box.id);
      moves.push({ row: box.anchor.row, col: box.anchor.col, boxId: box.id });
    }
  }

  return moves;
}

export function hasAnyLegalMove(
  board: GameBoard,
  player: Player,
  turn: {
    tapsRemaining: number;
    tapsPerTurn: number;
    firstTapBoxId: string | null;
    dangerTapCount: number;
    dangerTerritoryLinked: boolean;
    normalTapUsedThisTurn: boolean;
  }
): boolean {
  if (turn.tapsRemaining <= 0) return false;
  return hasAnyLegalMoveForPlayer(board, player);
}

/** True when the player has used at least one tap but still has taps left this turn. */
export function isMidTurn(turn: {
  tapsRemaining: number;
  tapsPerTurn: number;
}): boolean {
  return turn.tapsRemaining > 0 && turn.tapsRemaining < turn.tapsPerTurn;
}

export function isValidTapTarget(
  board: GameBoard,
  row: number,
  col: number,
  ctx: MoveContext
): boolean {
  const box = getBoxAt(board, row, col);
  if (!box) return false;

  if (isValidNeutralTarget(board, box, ctx)) return true;
  if (isValidMaturedOrphanTarget(box, ctx)) return true;
  return isValidSelfAttackTarget(box, ctx);
}

export function isSelfAttackMove(
  board: GameBoard,
  row: number,
  col: number,
  player: Player
): boolean {
  const box = getBoxAt(board, row, col);
  return box?.owner === player;
}

export function isTappableBox(
  board: GameBoard,
  boxId: string,
  ctx: MoveContext
): boolean {
  return getValidMoves(board, ctx).some((m) => m.boxId === boxId);
}
