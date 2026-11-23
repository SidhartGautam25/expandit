import { GameBoard } from "../../types/board";
import { GameBox, isOneBeforeCapture, isMaturedOrphan } from "../../types/box";
import { Player } from "../../types/game";
import { getValidMoves, MoveContext, isValidTapAction, isValidFreezeTarget, TurnRuleState } from "../rules/moveRules";
import { checkWinCondition } from "../rules/winRules";
import {
  executeTap,
  executeFreeze,
  canFreezeBox,
  canInitiateFreezeTurn,
  isCaptureMove,
  getTapCostForBox,
  isFrozenPlot,
} from "../rules/tapRules";
import { getBoxAt } from "../board/boardFactory";
import { getAdjacentBoxIds, isAdjacentToPlayerTerritory, playerHasCapturedTerritory, canPlayerCaptureBox } from "../board/boundary";
import { LEVEL_REGISTRY } from "../../constants/levels";

let nodeCount = 0;
const MAX_NODES = 60000;
const DEFAULT_TIME_BUDGET_MS = 700;

/**
 * A decapture is a repositioning maneuver, not a toggle.
 *
 * The engine previously had no memory of WHY a plot was decaptured. After the
 * decapture was executed, the next call to getBotAction saw that same plot as
 * a fresh legal/immediate capture. The hard immediate-capture override then
 * forced the bot to take it back, producing:
 *
 *   DEC(A) -> CAPTURE(A) -> DEC(A) -> CAPTURE(A) ...
 *
 * Keep a short-lived plan keyed by the exact post-decapture board position.
 * This avoids cross-game state leaking into another game and tells the next
 * decision exactly where the sacrifice was supposed to lead.
 */
type DecapturePlan = {
  player: Player;
  decapturedBoxId: string;
  targetBoxId: string;
};

const pendingDecapturePlans = new Map<string, DecapturePlan>();

/**
 * Decapture is an emergency-only mechanic.
 *
 * Policy:
 *   1. A bot may decapture at most ONCE during a game.
 *   2. It may only decapture when there is NO other legal non-decapture move.
 *   3. Normal play therefore remains capture/territory-expansion first.
 *
 * The engine does not receive a gameId, so the board geometry is used as the
 * game identity and a pristine board resets the per-game budget. This keeps
 * the cap local to a game without changing the public API.
 */
const decaptureUsedByGame = new Set<string>();

function gameGeometryKey(board: GameBoard): string {
  return Object.values(board.boxes)
    .map((box) => `${box.id}:${box.size}:${box.captureThreshold}`)
    .sort()
    .join("|");
}

function isPristineBoard(board: GameBoard): boolean {
  return Object.values(board.boxes).every(
    (box) =>
      box.owner === null &&
      box.count === 0 &&
      box.frozenBy === null &&
      box.claimedBy === null
  );
}

function decaptureBudgetKey(board: GameBoard, player: Player): string {
  return `${gameGeometryKey(board)}|player:${player}`;
}

function hasUsedDecapture(board: GameBoard, player: Player): boolean {
  return decaptureUsedByGame.has(decaptureBudgetKey(board, player));
}

function markDecaptureUsed(board: GameBoard, player: Player): void {
  decaptureUsedByGame.add(decaptureBudgetKey(board, player));
}

function resetDecaptureBudgetIfNewGame(board: GameBoard): void {
  if (isPristineBoard(board)) {
    decaptureUsedByGame.clear();
    pendingDecapturePlans.clear();
  }
}


function boardStateKey(board: GameBoard, player: Player): string {
  const boxes = Object.values(board.boxes)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((box) =>
      [
        box.id,
        box.owner ?? 0,
        box.count,
        box.captureThreshold,
        box.frozenBy ?? 0,
        box.claimedBy ?? 0,
      ].join(":")
    )
    .join("|");

  return `${player}|${boxes}`;
}

function rememberDecapturePlan(
  boardAfterDecapture: GameBoard,
  player: Player,
  decapturedBoxId: string,
  targetBoxId: string
): void {
  pendingDecapturePlans.set(boardStateKey(boardAfterDecapture, player), {
    player,
    decapturedBoxId,
    targetBoxId,
  });

  // This is deliberately tiny. A plan is only useful for the immediately
  // following decision; stale plans must never accumulate.
  if (pendingDecapturePlans.size > 16) {
    const firstKey = pendingDecapturePlans.keys().next().value;
    if (firstKey) pendingDecapturePlans.delete(firstKey);
  }
}

function getPendingDecapturePlan(
  board: GameBoard,
  player: Player
): DecapturePlan | null {
  return pendingDecapturePlans.get(boardStateKey(board, player)) ?? null;
}

function clearPendingDecapturePlan(board: GameBoard, player: Player): void {
  pendingDecapturePlans.delete(boardStateKey(board, player));
}

export const EVAL = {
  TERRITORY: 100,
  FROZEN_LOCK: 70,
  // IMPORTANT: CAPTURE_READY must stay low enough that FRONTIER_UNIQUE + max
  // PROGRESS + CAPTURE_READY (all summed for a one-tap-from-capture plot)
  // never exceeds TERRITORY (the value of just owning the plot outright).
  // At 90 this was violated (30 + ~14 + 90 > 100 per size unit), which meant
  // the search saw self-decapturing an owned plot down to "danger" status as
  // a way to literally raise its own evaluation score — a pure scoring
  // exploit that had nothing to do with real strategy.
  CAPTURE_READY: 30,
  OPP_CAPTURE_READY: 30,
  FRONTIER_UNIQUE: 30,
  CONTESTED: 20,
  INTERIOR: 5,
  PROGRESS: 16,
  CHOKE: 30,
  ORPHAN: 30,
  MOBILITY: 3,
  WIN: 100000,
  FREE_SLOT: 55,            // only applied when a real second-hub target exists (see hasWorthySecondHubTarget)
  SECOND_HUB_SEED: 45,      // reward planting a new independent hub on a sizeable plot
} as const;

export type BotAction =
  | { type: "tap"; row: number; col: number }
  | { type: "freeze"; row: number; col: number };

type SearchMove =
  | { kind: "tap"; row: number; col: number }
  | { kind: "freeze"; row: number; col: number };

type FrontierKind = "own" | "opp" | "contested" | "interior";

function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function buildTurnRuleState(
  tapsRemaining: number,
  tapsPerTurn: number,
  excludedBoxId: string | null,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean,
  normalTapUsedThisTurn: boolean
): TurnRuleState {
  return {
    tapsRemaining,
    tapsPerTurn,
    firstTapBoxId: excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
    normalTapUsedThisTurn,
  };
}

function buildMoveContext(
  activePlayer: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  excludedBoxId: string | null,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean
): MoveContext {
  return {
    activePlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
  };
}

function ownedSet(board: GameBoard, player: Player): Set<string> {
  const ids = new Set<string>();
  for (const box of Object.values(board.boxes)) {
    if (box.owner === player) ids.add(box.id);
  }
  return ids;
}

function bordersSet(board: GameBoard, boxId: string, owned: Set<string>): boolean {
  for (const neighborId of getAdjacentBoxIds(board, boxId)) {
    if (owned.has(neighborId)) return true;
  }
  return false;
}

/**
 * Number of DISTINCT neighboring plots (regardless of owner/state) that a box
 * shares a boundary with. Used to prefer captures that open up the most future
 * expansion options, i.e. "shares boundary with more plots".
 */
function adjacentPlotCount(board: GameBoard, boxId: string): number {
  const neighbors = getAdjacentBoxIds(board, boxId);
  return new Set(neighbors).size;
}

/**
 * Sum of sizes of neutral, not-yet-frontier neighboring plots — used as a
 * secondary tiebreaker for how much future territory a capture opens up.
 */
function adjacentUncapturedSize(board: GameBoard, boxId: string): number {
  let total = 0;
  const seen = new Set<string>();
  for (const neighborId of getAdjacentBoxIds(board, boxId)) {
    if (seen.has(neighborId)) continue;
    seen.add(neighborId);
    const neighbor = board.boxes[neighborId];
    if (neighbor && neighbor.owner === null) total += neighbor.size;
  }
  return total;
}

function frontierKind(board: GameBoard, boxId: string, player: Player, own: Set<string>, opp: Set<string>): FrontierKind {
  const us = bordersSet(board, boxId, own);
  const them = bordersSet(board, boxId, opp);
  if (us && them) return "contested";
  if (us) return "own";
  if (them) return "opp";
  return "interior";
}

function chokeValue(board: GameBoard, boxId: string, owned: Set<string>): number {
  let extra = 0;
  for (const neighborId of getAdjacentBoxIds(board, boxId)) {
    const neighbor = board.boxes[neighborId];
    if (!neighbor || neighbor.owner !== null) continue;
    if (bordersSet(board, neighborId, owned)) continue;
    extra += neighbor.size;
  }
  return extra;
}

function futureOwner(
  board: GameBoard,
  box: GameBox,
  player: Player,
  own: Set<string>,
  opp: Set<string>
): Player | "contested" | null {
  if (box.owner) return box.owner;
  if (box.frozenBy) return box.frozenBy;

  const kind = frontierKind(board, box.id, player, own, opp);
  if (kind === "own") return player;
  if (kind === "opp") return otherPlayer(player);
  if (kind === "contested") return "contested";

  const hasOwn = own.size > 0;
  const hasOpp = opp.size > 0;
  if (!hasOwn && !hasOpp) {
    if (box.claimedBy) return box.claimedBy;
    return null;
  }
  return null;
}

function canSideCaptureNow(board: GameBoard, box: GameBox, side: Player): boolean {
  if (box.owner !== null) return false;
  if (!isOneBeforeCapture(box)) return false;
  if (box.frozenBy !== null && box.frozenBy !== side) return false;
  return canPlayerCaptureBox(board, box.id, side);
}

function progressRatio(box: GameBox): number {
  if (box.captureThreshold <= 0) return 0;
  return Math.min(box.count, box.captureThreshold) / box.captureThreshold;
}

/**
 * Is there an actual, worthwhile place on the board to plant a second/new
 * territory hub right now? "Worthwhile" means a genuinely independent
 * (interior) plot that's either sizeable (3+ boxes) or already has real
 * invested progress on it. Without a target like this, having a "free slot"
 * is meaningless — there is nothing to spend it on.
 */
function hasWorthySecondHubTarget(
  board: GameBoard,
  player: Player,
  own: Set<string>,
  opp: Set<string>,
  excludeBoxId?: string
): boolean {
  for (const box of Object.values(board.boxes)) {
    if (box.id === excludeBoxId) continue;
    if (box.owner !== null) continue;
    if (isMaturedOrphan(box)) continue;
    if (frontierKind(board, box.id, player, own, opp) !== "interior") continue;
    if (box.size >= 3 || box.count > 0) return true;
  }
  return false;
}

/**
 * Quantifies how rewarding the best available "start a new hub" opportunity
 * is: bigger plots count for more, and plots that are already close to their
 * capture threshold (one or two taps away — "max-1"/"max-2") count for a lot
 * more, since those are genuinely easy, near-term captures rather than
 * theoretical ones. Used to decide whether a decapture sacrifice is actually
 * justified by something clearly better, not just "something exists".
 */
function secondHubOpportunityValue(
  board: GameBoard,
  player: Player,
  own: Set<string>,
  opp: Set<string>,
  excludeBoxId?: string
): number {
  let value = 0;
  for (const box of Object.values(board.boxes)) {
    if (box.id === excludeBoxId) continue;
    if (box.owner !== null) continue;
    if (isMaturedOrphan(box)) continue;
    if (frontierKind(board, box.id, player, own, opp) !== "interior") continue;

    const remaining = box.captureThreshold - box.count;
    let weight = 1;
    if (remaining <= 1) weight = 4;       // one tap from capture — max-1
    else if (remaining <= 2) weight = 2.5; // two taps from capture — max-2

    value += box.size * weight;
  }
  return value;
}

/**
 * Pick the concrete second-hub target that justifies a decapture.
 *
 * This is intentionally stricter than hasWorthySecondHubTarget(): the bot
 * should decapture for a specific destination, not merely because "something
 * somewhere looks interesting".
 */
function bestSecondHubTargetId(
  board: GameBoard,
  player: Player,
  own: Set<string>,
  opp: Set<string>,
  excludeBoxId?: string
): string | null {
  let bestId: string | null = null;
  let bestValue = -Infinity;

  for (const box of Object.values(board.boxes)) {
    if (box.id === excludeBoxId) continue;
    if (box.owner !== null) continue;
    if (isMaturedOrphan(box)) continue;
    if (frontierKind(board, box.id, player, own, opp) !== "interior") continue;

    const remaining = box.captureThreshold - box.count;
    let urgency = 1;
    if (remaining <= 1) urgency = 4;
    else if (remaining <= 2) urgency = 2.5;

    // Reward the things that actually make a second hub useful:
    // value of the plot + connectivity + nearby future territory.
    const value =
      box.size * 100 * urgency +
      adjacentPlotCount(board, box.id) * 12 +
      adjacentUncapturedSize(board, box.id) * 5 +
      box.count * 8;

    if (value > bestValue) {
      bestValue = value;
      bestId = box.id;
    }
  }

  return bestId;
}

/**
 * Total size (in boxes) of the connected cluster of owned plots that `startId`
 * belongs to. Used to make sure decapturing only ever sacrifices a small,
 * low-value foothold — never a cluster the bot has actually invested in.
 */
function clusterTotalSize(board: GameBoard, own: Set<string>, startId: string): number {
  if (!own.has(startId)) return 0;
  const visited = new Set<string>([startId]);
  const queue = [startId];
  let total = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentBox = board.boxes[current];
    if (currentBox) total += currentBox.size;
    for (const neighborId of getAdjacentBoxIds(board, current)) {
      if (own.has(neighborId) && !visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }
  return total;
}

/**
 * Count independent territory clusters (connected components) for a player.
 */
function countClusters(board: GameBoard, player: Player): number {
  const owned = ownedSet(board, player);
  if (owned.size === 0) return 0;
  const visited = new Set<string>();
  let clusters = 0;
  for (const id of owned) {
    if (visited.has(id)) continue;
    clusters++;
    const queue = [id];
    visited.add(id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighborId of getAdjacentBoxIds(board, current)) {
        if (owned.has(neighborId) && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }
  return clusters;
}

export function evaluateBoard(board: GameBoard, player: Player): number {
  const opponent = otherPlayer(player);
  const win = checkWinCondition(board);
  if (win.isOver) {
    if (win.player1Score === win.player2Score) return 0;
    const weWin =
      (player === 1 && win.player1Score > win.player2Score) ||
      (player === 2 && win.player2Score > win.player1Score);
    const margin = player === 1
      ? win.player1Score - win.player2Score
      : win.player2Score - win.player1Score;
    return (weWin ? EVAL.WIN : -EVAL.WIN) + margin * EVAL.TERRITORY;
  }

  const own = ownedSet(board, player);
  const opp = ownedSet(board, opponent);
  let score = 0;
  let freezeTargets = 0;
  let captureReady = 0;

  // Territory slot awareness — an open slot is only good if it gets used to capture,
  // so weight it more heavily and add an explicit "seed a second hub" incentive below.
  const myClusters = countClusters(board, player);
  const oppClusters = countClusters(board, opponent);
  if (myClusters > 0 && myClusters < 2 && hasWorthySecondHubTarget(board, player, own, opp)) {
    score += EVAL.FREE_SLOT * (2 - myClusters);
  }
  if (oppClusters > 0 && oppClusters < 2 && hasWorthySecondHubTarget(board, opponent, opp, own)) {
    score -= EVAL.FREE_SLOT * (2 - oppClusters);
  }

  for (const box of Object.values(board.boxes)) {
    const choke = chokeValue(board, box.id, own);
    const oppChoke = chokeValue(board, box.id, opp);

    if (box.owner === player) {
      score += box.size * EVAL.TERRITORY;
      score += choke * EVAL.CHOKE;
      continue;
    }
    if (box.owner === opponent) {
      score -= box.size * EVAL.TERRITORY;
      score -= oppChoke * EVAL.CHOKE;
      continue;
    }

    const kind = frontierKind(board, box.id, player, own, opp);
    const future = futureOwner(board, box, player, own, opp);
    const progress = progressRatio(box) * box.size * EVAL.PROGRESS;

    if (box.frozenBy === player) {
      score += box.size * EVAL.FROZEN_LOCK;
      score += progress;
      if (canSideCaptureNow(board, box, player)) {
        score += box.size * EVAL.CAPTURE_READY;
        captureReady += box.size;
      }
      score += choke * EVAL.CHOKE;
    } else if (box.frozenBy === opponent) {
      score -= box.size * EVAL.FROZEN_LOCK;
      score -= progress;
      if (canSideCaptureNow(board, box, opponent)) {
        score -= box.size * EVAL.OPP_CAPTURE_READY;
      }
      score -= oppChoke * EVAL.CHOKE;
    } else {
      if (kind === "own") {
        score += box.size * EVAL.FRONTIER_UNIQUE;
        score += choke * EVAL.CHOKE;
        if (future === player) score += progress;
        if (canSideCaptureNow(board, box, player)) {
          score += box.size * EVAL.CAPTURE_READY;
          captureReady += box.size;
        }
        freezeTargets += box.size;
      } else if (kind === "opp") {
        score -= box.size * EVAL.FRONTIER_UNIQUE;
        score -= oppChoke * EVAL.CHOKE;
        if (future === opponent) score -= progress;
        if (canSideCaptureNow(board, box, opponent)) {
          score -= box.size * EVAL.OPP_CAPTURE_READY;
        }
      } else if (kind === "contested") {
        score += (choke - oppChoke) * EVAL.CHOKE;
        if (box.claimedBy === player) score += progress * 0.5;
        else if (box.claimedBy === opponent) score -= progress * 0.5;
        if (canSideCaptureNow(board, box, player)) {
          score += box.size * EVAL.CAPTURE_READY;
          captureReady += box.size;
        }
        if (canSideCaptureNow(board, box, opponent)) {
          score -= box.size * EVAL.OPP_CAPTURE_READY;
        }
        score += box.size * 2;
        freezeTargets += box.size * 2;
      } else {
        score += box.size * EVAL.INTERIOR;
        if (box.claimedBy === player) score += progress * 0.35;
        else if (box.claimedBy === opponent) score -= progress * 0.35;
        if (own.size === 0) {
          score += box.size * 8 + choke * EVAL.CHOKE;
        } else if (myClusters < 2) {
          // We still have a free territory slot — reward building progress on
          // sizeable interior plots, since that's how a second hub gets planted.
          score += progressRatio(box) * box.size * EVAL.SECOND_HUB_SEED;
          if (box.size >= 3) score += box.size * 4;
        }
      }
    }

    if (isMaturedOrphan(box)) {
      if (future === player) score += box.size * EVAL.ORPHAN;
      else if (future === opponent) score -= box.size * EVAL.ORPHAN;
      else if (future === "contested") {
        if (box.claimedBy === player) score += box.size * (EVAL.ORPHAN * 0.6);
        else if (box.claimedBy === opponent) score -= box.size * (EVAL.ORPHAN * 0.6);
      }
    }
  }

  score += freezeTargets * EVAL.MOBILITY;
  score += captureReady * 2;
  return score;
}

function getFreezeMoves(board: GameBoard, player: Player): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = [];
  const seen = new Set<string>();

  for (const box of Object.values(board.boxes)) {
    if (seen.has(box.id)) continue;
    if (!canFreezeBox(board, box.anchor.row, box.anchor.col, player)) continue;
    seen.add(box.id);
    moves.push({ row: box.anchor.row, col: box.anchor.col });
  }

  return moves;
}

function boxAt(board: GameBoard, row: number, col: number): GameBox | undefined {
  const boxId = board.cellMap[row]?.[col];
  return boxId ? board.boxes[boxId] : undefined;
}

/**
 * Determines if a tap would be actively harmful (poison) and should be avoided.
 * Now correctly only blocks danger plots that border only enemy territory.
 * Also allows decapturing own plots.
 */
function isPoisonTap(board: GameBoard, row: number, col: number, player: Player): boolean {
  const box = boxAt(board, row, col);
  if (!box) return true;

  // Cannot tap opponent's captured plot
  if (box.owner !== null && box.owner !== player) return true;

  // Tapping an opponent-frozen plot is usually bad (gives them progress)
  if (isFrozenPlot(box) && box.frozenBy !== player) return true;

  const opponent = otherPlayer(player);
  const ownFrontier = isAdjacentToPlayerTerritory(board, box.id, player);
  const oppFrontier = isAdjacentToPlayerTerritory(board, box.id, opponent);

  // Matured orphans are already at max count; tapping them does nothing useful
  if (isMaturedOrphan(box)) {
    return true;
  }

  // The dangerous case: tapping a danger plot that borders ONLY enemy territory
  // will gift the capture to the opponent.
  if (oppFrontier && !ownFrontier && isOneBeforeCapture(box) && box.frozenBy !== player) {
    return true;
  }

  // All other taps are allowed (including own decaptures)
  return false;
}

function wouldGiftFrozenCapture(board: GameBoard, row: number, col: number, player: Player): boolean {
  const box = getBoxAt(board, row, col);
  if (!box?.frozenBy || box.frozenBy === player || !isOneBeforeCapture(box)) {
    return false;
  }
  return true;
}

/**
 * Score used purely to RANK a move that is already known to be an immediate
 * capture. Bigger plots win first; among equal-size plots, prefer the one that
 * borders the most other plots (more future expansion options), then the one
 * whose neutral neighbors hold the most total uncaptured size.
 */
function captureRankScore(board: GameBoard, box: GameBox): number {
  const boundaryCount = adjacentPlotCount(board, box.id);
  const uncapturedNeighborSize = adjacentUncapturedSize(board, box.id);
  return box.size * 1000 + boundaryCount * 40 + uncapturedNeighborSize * 6;
}

function orderScore(
  board: GameBoard,
  move: SearchMove,
  player: Player,
  own: Set<string>,
  opp: Set<string>
): number {
  const opponent = otherPlayer(player);
  const box = boxAt(board, move.row, move.col);
  if (!box) return -9999;

  if (move.kind === "freeze") {
    const kind = frontierKind(board, box.id, player, own, opp);
    let s = box.size * 40 + chokeValue(board, box.id, own) * 12;
    if (kind === "contested") s += 80 + box.size * 10;
    if (isOneBeforeCapture(box)) s += 50;
    if (box.count > 0 && box.claimedBy === opponent) s += 35;
    return s;
  }

  if (wouldGiftFrozenCapture(board, move.row, move.col, player)) return -800;
  if (isPoisonTap(board, move.row, move.col, player)) return -700;

  // Immediate captures are ALWAYS top priority. Rank captures amongst themselves
  // by plot size first, then by how many other plots they border (more boundary
  // = more future options), then by the total uncaptured size touching them.
  if (isCaptureMove(board, move.row, move.col, player)) {
    return 100000 + captureRankScore(board, box);
  }

  const kind = frontierKind(board, box.id, player, own, opp);
  const choke = chokeValue(board, box.id, own);

  // Tapping own plot (decapture) — this should be RARE and deliberate. It is
  // only ever worth it when both territory slots are already full, the
  // decapture actually frees one, the plot being sacrificed is a small/low
  // value foothold, and there's a clearly BETTER opportunity elsewhere
  // (bigger plots, and/or plots already near their capture threshold) that
  // justifies giving it up. Otherwise it's a wasted turn.
  if (box.owner === player) {
    // Decapture is a one-time emergency action and is never part of normal
    // territory expansion. collectSearchMoves removes these moves whenever
    // another legal action exists; this guard also prevents stale callers
    // from treating decapture as a competitive move.
    if (hasUsedDecapture(board, player)) return -1000000;

    const myClustersNow = countClusters(board, player);

    // A slot is already free — there is never a reason to decapture anything.
    if (myClustersNow < 2) return -1000000;

    const tempBoxes = { ...board.boxes, [box.id]: { ...box, owner: null } };
    const tempBoard = { ...board, boxes: tempBoxes };
    const newClusters = countClusters(tempBoard, player);

    // Must actually free a slot (strictly fewer clusters after removal).
    if (newClusters >= myClustersNow) return -1000;

    // Never give up a cluster the bot has actually developed — only a lone,
    // small foothold is an acceptable sacrifice.
    const sacrificedSize = clusterTotalSize(board, own, box.id);
    if (sacrificedSize > 2) return -700;

    // The alternative opportunity must be CLEARLY more rewarding than what's
    // sacrificed — bigger plots and/or plots already near capture (max-1,
    // max-2) count for more. Require it to beat the sacrifice by a solid
    // margin, so this only triggers for genuinely good trades, not marginal
    // ones.
    const opportunityValue = secondHubOpportunityValue(board, player, own, opp, box.id);
    const sacrificeValue = box.size * 3; // treat the sacrifice like a "max-1" plot's worth
    if (opportunityValue <= sacrificeValue * 1.5) return -700;

    // Justified: modest, deliberate bonus — this should only barely edge out
    // ordinary frontier progress when it's genuinely the best use of a turn.
    return 25;
  }

  if (isFrozenPlot(box) && box.frozenBy === player) {
    let s = 40 + box.size * 8;
    if (isOneBeforeCapture(box) && (own.size === 0 || kind === "own" || kind === "contested")) {
      s += 120;
    }
    return s;
  }

  const myClusters = countClusters(board, player);

  if (kind === "own") {
    // Territory expansion is the default behavior. Prefer larger frontier
    // plots, then plots that open many boundaries, then current progress.
    let s =
      40 +
      box.size * 24 +
      adjacentPlotCount(board, box.id) * 8 +
      adjacentUncapturedSize(board, box.id) * 3 +
      choke * 10 +
      box.count * 6;

    // Getting close to another capture matters, but size/connectivity remain
    // part of the ranking instead of allowing tiny danger plots to dominate.
    if (isOneBeforeCapture(box)) s += 90 + box.size * 12;
    else s += progressRatio(box) * box.size * 24;

    return s;
  }

  if (kind === "contested") {
    return (
      25 +
      box.size * 18 +
      adjacentPlotCount(board, box.id) * 6 +
      adjacentUncapturedSize(board, box.id) * 2 +
      box.count * 5
    );
  }

  if (kind === "interior") {
    if (own.size === 0) {
      // No territory yet at all — prefer bigger plots to open the strongest first hub.
      return box.size * 30 + choke * 10 + adjacentPlotCount(board, box.id) * 4;
    }
    if (myClusters < 2) {
      // A second-hub slot is available: actively push progress on a sizeable,
      // well-connected plot elsewhere on the board rather than idling.
      let s =
        box.size * 24 +
        adjacentPlotCount(board, box.id) * 7 +
        adjacentUncapturedSize(board, box.id) * 3 +
        box.count * 5;
      if (box.size >= 3) s += 35; // favor 3/4/6-box plots as the second hub seed
      if (isOneBeforeCapture(box)) s += 90 + box.size * 10;
      return s;
    }
    return box.size * 2 + box.count;
  }

  return -50;
}


/**
 * Decapture is strictly a last resort. Return true only when every other
 * legal action has disappeared.
 *
 * A "real" alternative includes:
 *   - any legal tap on a non-owned plot (capture/progress/expansion), or
 *   - any legal freeze.
 *
 * If even one such action exists, owned plots are removed from the search
 * entirely. This prevents the evaluator from trading a healthy territory
 * away merely because decapture happens to improve a static score.
 */
function hasAnyNonDecaptureMove(
  board: GameBoard,
  ctx: MoveContext,
  turn: TurnRuleState
): boolean {
  for (const tap of getValidMoves(board, ctx)) {
    if (isPoisonTap(board, tap.row, tap.col, ctx.activePlayer)) continue;

    const box = boxAt(board, tap.row, tap.col);
    if (!box || box.owner === ctx.activePlayer) continue;

    if (isValidTapAction(board, tap.row, tap.col, ctx.activePlayer, turn)) {
      return true;
    }
  }

  if (canInitiateFreezeTurn(turn)) {
    for (const freeze of getFreezeMoves(board, ctx.activePlayer)) {
      if (
        isValidFreezeTarget(
          board,
          freeze.row,
          freeze.col,
          ctx.activePlayer,
          turn
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function collectSearchMoves(
  board: GameBoard,
  ctx: MoveContext,
  turn: TurnRuleState
): SearchMove[] {
  const moves: SearchMove[] = [];

  if (canInitiateFreezeTurn(turn)) {
    for (const freeze of getFreezeMoves(board, ctx.activePlayer)) {
      if (!isValidFreezeTarget(board, freeze.row, freeze.col, ctx.activePlayer, turn)) {
        continue;
      }
      moves.push({ kind: "freeze", row: freeze.row, col: freeze.col });
    }
  }

  const allowDecapture =
    !hasUsedDecapture(board, ctx.activePlayer) &&
    !hasAnyNonDecaptureMove(board, ctx, turn);

  for (const tap of getValidMoves(board, ctx)) {
    if (isPoisonTap(board, tap.row, tap.col, ctx.activePlayer)) continue;

    const box = boxAt(board, tap.row, tap.col);
    if (!box) continue;

    // Decapture is not a normal strategic option. It enters the move list
    // only when it is the final remaining class of legal action.
    if (box.owner === ctx.activePlayer && !allowDecapture) continue;

    moves.push({ kind: "tap", row: tap.row, col: tap.col });
  }

  const own = ownedSet(board, ctx.activePlayer);
  const opp = ownedSet(board, otherPlayer(ctx.activePlayer));

  moves.sort(
    (a, b) =>
      orderScore(board, b, ctx.activePlayer, own, opp) -
      orderScore(board, a, ctx.activePlayer, own, opp)
  );
  return moves;
}

function applySearchMove(
  board: GameBoard,
  move: SearchMove,
  currentPlayer: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean
): {
  board: GameBoard;
  nextPlayer: Player;
  nextTaps: number;
  nextExcluded: string | null;
  nextDangerCount: number;
  nextDangerTerritoryLinked: boolean;
} | null {
  if (move.kind === "freeze") {
    const result = executeFreeze(board, move.row, move.col, currentPlayer);
    if (result.board === board) return null;
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    return {
      board: result.board,
      nextPlayer,
      nextTaps: tapsPerTurn,
      nextExcluded: null,
      nextDangerCount: 0,
      nextDangerTerritoryLinked: false,
    };
  }

  const moveBox = boxAt(board, move.row, move.col);
  const result = executeTap(board, move.row, move.col, currentPlayer);
  if (result.board === board) return null;

  const tapCost = moveBox ? getTapCostForBox(moveBox, currentPlayer) : 1;
  let nextTaps = tapsRemaining - tapCost;
  let nextPlayer = currentPlayer;
  let nextExcluded: string | null = moveBox?.id ?? null;
  let nextDangerCount = dangerTapCount;
  let nextDangerTerritoryLinked = dangerTerritoryLinked;

  if (moveBox && isOneBeforeCapture(moveBox)) {
    nextDangerCount += 1;
    if (isAdjacentToPlayerTerritory(board, moveBox.id, currentPlayer)) {
      nextDangerTerritoryLinked = true;
    }
  }

  if (nextTaps <= 0) {
    nextTaps = tapsPerTurn;
    nextPlayer = currentPlayer === 1 ? 2 : 1;
    nextExcluded = null;
    nextDangerCount = 0;
    nextDangerTerritoryLinked = false;
  }

  return {
    board: result.board,
    nextPlayer,
    nextTaps,
    nextExcluded,
    nextDangerCount,
    nextDangerTerritoryLinked,
  };
}

const MAX_LEAF_TACTICS = 3;

function collectLeafTactics(
  board: GameBoard,
  ctx: MoveContext,
  turn: Pick<TurnRuleState, "tapsRemaining" | "normalTapUsedThisTurn">,
  player: Player,
  maxCount: number
): SearchMove[] {
  const tactics: SearchMove[] = [];

  for (const tap of getValidMoves(board, ctx)) {
    if (isCaptureMove(board, tap.row, tap.col, player)) {
      tactics.push({ kind: "tap", row: tap.row, col: tap.col });
      if (tactics.length >= maxCount) return tactics;
    }
  }

  if (canInitiateFreezeTurn(turn)) {
    for (const freeze of getFreezeMoves(board, player)) {
      const box = boxAt(board, freeze.row, freeze.col);
      if (!box) continue;
      if (!(isOneBeforeCapture(box) || box.size >= 3)) continue;
      if (!isValidFreezeTarget(board, freeze.row, freeze.col, player, turn)) continue;
      tactics.push({ kind: "freeze", row: freeze.row, col: freeze.col });
      if (tactics.length >= maxCount) return tactics;
    }
  }

  return tactics;
}

function leafScore(
  board: GameBoard,
  maximizingPlayer: Player,
  currentPlayer: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  excludedBoxId: string | null,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean
): number {
  const standing = evaluateBoard(board, maximizingPlayer);
  if (nodeCount >= MAX_NODES * 0.85) return standing;

  const ctx = buildMoveContext(
    currentPlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked
  );
  const turn = buildTurnRuleState(
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
    excludedBoxId !== null
  );

  const tactics = collectLeafTactics(board, ctx, turn, currentPlayer, MAX_LEAF_TACTICS);
  if (tactics.length === 0) return standing;

  const maximizing = currentPlayer === maximizingPlayer;
  let best = standing;

  for (const move of tactics) {
    nodeCount++;
    if (nodeCount >= MAX_NODES) break;
    const applied = applySearchMove(
      board,
      move,
      currentPlayer,
      tapsRemaining,
      tapsPerTurn,
      dangerTapCount,
      dangerTerritoryLinked
    );
    if (!applied) continue;
    const value = evaluateBoard(applied.board, maximizingPlayer);
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
  }

  return best;
}

function isTacticalMove(board: GameBoard, move: SearchMove, player: Player): boolean {
  if (move.kind === "freeze") {
    const box = boxAt(board, move.row, move.col);
    if (!box) return false;
    return isOneBeforeCapture(box) || box.size >= 3;
  }
  return isCaptureMove(board, move.row, move.col, player);
}

function minimax(
  board: GameBoard,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Player,
  maximizingPlayer: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  excludedBoxId: string | null,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean,
  deadline: number
): { score: number; move: SearchMove | null; timedOut: boolean } {
  nodeCount++;

  const winState = checkWinCondition(board);
  if (winState.isOver || nodeCount >= MAX_NODES) {
    return { score: evaluateBoard(board, maximizingPlayer), move: null, timedOut: false };
  }

  if (Date.now() >= deadline) {
    return { score: evaluateBoard(board, maximizingPlayer), move: null, timedOut: true };
  }

  if (depth === 0) {
    return {
      score: leafScore(
        board,
        maximizingPlayer,
        currentPlayer,
        tapsRemaining,
        tapsPerTurn,
        excludedBoxId,
        dangerTapCount,
        dangerTerritoryLinked
      ),
      move: null,
      timedOut: false,
    };
  }

  const ctx = buildMoveContext(
    currentPlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked
  );
  const turn = buildTurnRuleState(
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
    excludedBoxId !== null
  );
  const moves = collectSearchMoves(board, ctx, turn);
  if (moves.length === 0) {
    return { score: evaluateBoard(board, maximizingPlayer), move: null, timedOut: false };
  }

  let bestMove: SearchMove | null = null;
  let timedOut = false;

  if (currentPlayer === maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const applied = applySearchMove(
        board,
        move,
        currentPlayer,
        tapsRemaining,
        tapsPerTurn,
        dangerTapCount,
        dangerTerritoryLinked
      );
      if (!applied) continue;

      const evalResult = minimax(
        applied.board,
        depth - 1,
        alpha,
        beta,
        applied.nextPlayer,
        maximizingPlayer,
        applied.nextTaps,
        tapsPerTurn,
        applied.nextExcluded,
        applied.nextDangerCount,
        applied.nextDangerTerritoryLinked,
        deadline
      );

      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (evalResult.timedOut) {
        timedOut = true;
        break;
      }
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove, timedOut };
  }

  let minEval = Infinity;
  for (const move of moves) {
    const applied = applySearchMove(
      board,
      move,
      currentPlayer,
      tapsRemaining,
      tapsPerTurn,
      dangerTapCount,
      dangerTerritoryLinked
    );
    if (!applied) continue;

    const evalResult = minimax(
      applied.board,
      depth - 1,
      alpha,
      beta,
      applied.nextPlayer,
      maximizingPlayer,
      applied.nextTaps,
      tapsPerTurn,
      applied.nextExcluded,
      applied.nextDangerCount,
      applied.nextDangerTerritoryLinked,
      deadline
    );

    if (evalResult.score < minEval) {
      minEval = evalResult.score;
      bestMove = move;
    }
    beta = Math.min(beta, evalResult.score);
    if (evalResult.timedOut) {
      timedOut = true;
      break;
    }
    if (beta <= alpha) break;
  }
  return { score: minEval, move: bestMove, timedOut };
}

function isMoveForBox(board: GameBoard, move: SearchMove, boxId: string): boolean {
  const box = boxAt(board, move.row, move.col);
  return box?.id === boxId;
}

function prioritizePendingDecapturePlan(
  board: GameBoard,
  moves: SearchMove[],
  plan: DecapturePlan | null,
  player: Player
): SearchMove[] {
  if (!plan || plan.player !== player) return moves;

  // Never immediately reverse the decapture if there is any other legal move.
  const withoutRecapture = moves.filter(
    (move) => !isMoveForBox(board, move, plan.decapturedBoxId)
  );

  if (withoutRecapture.length === 0) {
    // The plan has no executable continuation. Let normal move selection resume
    // rather than creating an artificial deadlock.
    return moves;
  }

  const targetMoves = withoutRecapture.filter(
    (move) => isMoveForBox(board, move, plan.targetBoxId)
  );

  // The concrete target is the first choice. Other expansion moves remain
  // available if the target has become invalid.
  return [...targetMoves, ...withoutRecapture.filter(
    (move) => !isMoveForBox(board, move, plan.targetBoxId)
  )];
}

function commitBotAction(
  board: GameBoard,
  action: BotAction | null,
  player: Player
): BotAction | null {
  if (!action) return null;

  const existingPlan = getPendingDecapturePlan(board, player);
  // Consume the previous plan at the moment a new action is committed.
  // If that action is itself a justified decapture, the logic below creates
  // the replacement plan on the new post-decapture board.
  if (existingPlan) clearPendingDecapturePlan(board, player);

  const box = boxAt(board, action.row, action.col);
  if (action.type === "tap" && box?.owner === player) {
    const own = ownedSet(board, player);
    const opp = ownedSet(board, otherPlayer(player));
    const myClusters = countClusters(board, player);

    // HARD RULE: any committed self-tap is the one allowed decapture.
    // collectSearchMoves already guarantees that this can only happen when
    // there is no other legal non-decapture action. Do not wait for an
    // "opportunity" test here — once the emergency move is actually played,
    // the one-use budget is consumed permanently.
    markDecaptureUsed(board, player);

    // Keep the useful continuation plan when this was a genuine hub reset.
    // The plan is optional; the one-time decapture budget is not.
    if (myClusters >= 2) {
      const tempBoxes = { ...board.boxes, [box.id]: { ...box, owner: null } };
      const tempBoard = { ...board, boxes: tempBoxes };
      const newClusters = countClusters(tempBoard, player);
      const sacrificedSize = clusterTotalSize(board, own, box.id);
      const targetId = bestSecondHubTargetId(board, player, own, opp, box.id);

      if (
        newClusters < myClusters &&
        sacrificedSize <= 2 &&
        targetId !== null
      ) {
        const opportunityValue = secondHubOpportunityValue(
          board,
          player,
          own,
          opp,
          box.id
        );
        const sacrificeValue = box.size * 3;

        if (opportunityValue > sacrificeValue * 1.5) {
          const probe = executeTap(board, action.row, action.col, player);
          if (probe.board !== board) {
            rememberDecapturePlan(
              probe.board,
              player,
              box.id,
              targetId
            );
          }
        }
      }
    }
  }

  // If this action was a justified decapture, the replacement plan was already
  // recorded against its post-decapture board above. Otherwise the previous
  // plan has been consumed.
  return action;
}

function pickExecutableAction(
  board: GameBoard,
  actions: BotAction[],
  player: Player,
  turn: TurnRuleState
): BotAction | null {
  for (const action of actions) {
    if (action.type === "freeze") {
      if (!isValidFreezeTarget(board, action.row, action.col, player, turn)) continue;
      const probe = executeFreeze(board, action.row, action.col, player);
      if (probe.board !== board) return action;
    } else {
      if (!isValidTapAction(board, action.row, action.col, player, turn)) continue;
      const probe = executeTap(board, action.row, action.col, player);
      if (probe.board !== board) return action;
    }
  }
  return null;
}

function toBotAction(move: SearchMove): BotAction {
  return move.kind === "freeze"
    ? { type: "freeze", row: move.row, col: move.col }
    : { type: "tap", row: move.row, col: move.col };
}

function staticRootBest(
  board: GameBoard,
  moves: SearchMove[],
  player: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean
): { move: SearchMove; score: number } | null {
  let best: { move: SearchMove; score: number } | null = null;
  const own = ownedSet(board, player);
  const opp = ownedSet(board, otherPlayer(player));

  for (const move of moves) {
    const applied = applySearchMove(
      board,
      move,
      player,
      tapsRemaining,
      tapsPerTurn,
      dangerTapCount,
      dangerTerritoryLinked
    );
    if (!applied) continue;
    const score = evaluateBoard(applied.board, player) + orderScore(board, move, player, own, opp) * 0.15;
    if (!best || score > best.score) {
      best = { move, score };
    }
  }

  return best;
}

function iterativeDeepenBestMove(
  board: GameBoard,
  maxDepth: number,
  botPlayer: Player,
  tapsRemaining: number,
  tapsPerTurn: number,
  excludedBoxId: string | null,
  dangerTapCount: number,
  dangerTerritoryLinked: boolean,
  deadline: number
): SearchMove | null {
  let bestMove: SearchMove | null = null;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() >= deadline) break;

    const result = minimax(
      board,
      depth,
      -Infinity,
      Infinity,
      botPlayer,
      botPlayer,
      tapsRemaining,
      tapsPerTurn,
      excludedBoxId,
      dangerTapCount,
      dangerTerritoryLinked,
      deadline
    );

    if (!result.timedOut && result.move) {
      bestMove = result.move;
    } else if (result.timedOut) {
      break;
    }

    if (nodeCount >= MAX_NODES) break;
  }

  return bestMove;
}

export function getBotActionForLevel(
  levelNumber: number,
  board: GameBoard,
  botPlayer: Player = 2,
  tapsRemaining: number = 2,
  tapsPerTurn: number = 2,
  excludedBoxId: string | null = null,
  dangerTapCount: number = 0,
  dangerTerritoryLinked: boolean = false,
  normalTapUsedThisTurn: boolean = false,
  timeBudgetMs: number = DEFAULT_TIME_BUDGET_MS
): BotAction | null {
  resetDecaptureBudgetIfNewGame(board);

  const config = LEVEL_REGISTRY[levelNumber] || LEVEL_REGISTRY[1];
  const turn = buildTurnRuleState(
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
    normalTapUsedThisTurn
  );
  const ctx = buildMoveContext(
    botPlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked
  );
  const searchMoves = collectSearchMoves(board, ctx, turn);

  // If the previous move was a deliberate hub-reset decapture, the next move
  // has a concrete job: pursue the newly opened territory. In particular,
  // NEVER treat the decaptured plot as a fresh "free capture" while there is
  // any other legal move. This is the direct guard against:
  //
  //   decapture A -> immediate capture A -> decapture A -> ...
  //
  // The plan is keyed to the exact post-decapture board, so it cannot leak
  // between unrelated board positions/games.
  const pendingPlan = getPendingDecapturePlan(board, botPlayer);
  const plannedSearchMoves = prioritizePendingDecapturePlan(
    board,
    searchMoves,
    pendingPlan,
    botPlayer
  );

  // HARD OVERRIDE: immediate captures are still top priority, except for the
  // one plot we intentionally just decaptured. If another capture exists,
  // take that instead. If the concrete second-hub target is itself immediately
  // capturable, it naturally wins because it is first in plannedSearchMoves.
  const immediateCaptures = plannedSearchMoves.filter(
    (m) => m.kind === "tap" && isCaptureMove(board, m.row, m.col, botPlayer)
  );
  if (immediateCaptures.length > 0) {
    const own = ownedSet(board, botPlayer);
    const opp = ownedSet(board, otherPlayer(botPlayer));
    const ranked = [...immediateCaptures].sort(
      (a, b) => orderScore(board, b, botPlayer, own, opp) - orderScore(board, a, botPlayer, own, opp)
    );
    const bestCapture = pickExecutableAction(board, ranked.map(toBotAction), botPlayer, turn);
    if (bestCapture) return commitBotAction(board, bestCapture, botPlayer);
  }

  if (plannedSearchMoves.length === 0) {
    const rawTaps = getValidMoves(board, ctx).map((tap) => ({
      kind: "tap" as const,
      row: tap.row,
      col: tap.col,
    }));
    const fallbackMoves: SearchMove[] = rawTaps.filter(
      (m) => !isPoisonTap(board, m.row, m.col, botPlayer)
    );
    const lastResort = fallbackMoves.length > 0 ? fallbackMoves : rawTaps;
    const plannedFallback = prioritizePendingDecapturePlan(
      board,
      lastResort,
      pendingPlan,
      botPlayer
    );
    const action = pickExecutableAction(
      board,
      plannedFallback.map(toBotAction),
      botPlayer,
      turn
    );
    return commitBotAction(board, action, botPlayer);
  }

  // A decapture plan is a deliberate two-stage maneuver, so do not let the
  // level's blunder randomization throw away its continuation.
  if (!pendingPlan && Math.random() < config.blunderRate) {
    const shuffled = [...plannedSearchMoves].sort(() => Math.random() - 0.5);
    return commitBotAction(
      board,
      pickExecutableAction(board, shuffled.map(toBotAction), botPlayer, turn),
      botPlayer
    );
  }

  const staticBest = staticRootBest(
    board,
    plannedSearchMoves,
    botPlayer,
    tapsRemaining,
    tapsPerTurn,
    dangerTapCount,
    dangerTerritoryLinked
  );

  nodeCount = 0;
  const deadline = Date.now() + timeBudgetMs;
  const deepMove = iterativeDeepenBestMove(
    board,
    config.searchDepth,
    botPlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked,
    deadline
  );

  const candidates: SearchMove[] = [];
  const pushUnique = (move: SearchMove | null | undefined) => {
    if (!move) return;
    if (candidates.some((c) => c.kind === move.kind && c.row === move.row && c.col === move.col)) {
      return;
    }
    candidates.push(move);
  };

  // Recursive minimax does not know about the short-lived post-decapture plan,
  // so a deep result can still recommend taking A back. Never let that result
  // override the root-level decapture guard.
  if (
    deepMove &&
    (!pendingPlan || !isMoveForBox(board, deepMove, pendingPlan.decapturedBoxId))
  ) {
    pushUnique(deepMove);
  }

  pushUnique(staticBest?.move);
  for (const move of plannedSearchMoves) pushUnique(move);

  const verified = pickExecutableAction(board, candidates.map(toBotAction), botPlayer, turn);
  if (verified) return commitBotAction(board, verified, botPlayer);

  const fallback = pickExecutableAction(
    board,
    plannedSearchMoves.map(toBotAction),
    botPlayer,
    turn
  );
  return commitBotAction(board, fallback, botPlayer);
}

export function getBotMoveForLevel(
  levelNumber: number,
  board: GameBoard,
  botPlayer: Player = 2,
  tapsRemaining: number = 2,
  tapsPerTurn: number = 2,
  excludedBoxId: string | null = null,
  dangerTapCount: number = 0,
  dangerTerritoryLinked: boolean = false
): { row: number; col: number } | null {
  const action = getBotActionForLevel(
    levelNumber,
    board,
    botPlayer,
    tapsRemaining,
    tapsPerTurn,
    excludedBoxId,
    dangerTapCount,
    dangerTerritoryLinked
  );
  if (!action || action.type === "freeze") return null;
  return { row: action.row, col: action.col };
}