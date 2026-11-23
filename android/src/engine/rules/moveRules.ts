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
 * Covers affordance (incl. frozen = 2 taps), danger-plot limits, and same-box reuse.
 */
export function isValidTapAction(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  turn: TurnRuleState
): boolean {
  return isValidTapTarget(board, row, col, createMoveContext(player, turn));
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

  for (const list of [
    collectNeutralMoves(board, ctx),
    collectMaturedOrphanMoves(board, ctx),
    collectSelfAttackMoves(board, ctx),
  ]) {
    for (const move of list) {
      if (seen.has(move.boxId)) continue;
      seen.add(move.boxId);
      moves.push(move);
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

  const ctx = createMoveContext(player, turn);
  if (getValidMoves(board, ctx).length > 0) return true;

  if (!canInitiateFreezeTurn(turn)) return false;

  const seen = new Set<string>();
  for (const box of Object.values(board.boxes)) {
    if (seen.has(box.id)) continue;
    if (canFreezeBox(board, box.anchor.row, box.anchor.col, player)) return true;
    seen.add(box.id);
  }

  return false;
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
