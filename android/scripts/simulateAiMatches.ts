import { VISIBLE_CAMPAIGN_LEVELS } from "../src/registries/campaignLevels";
import { createBoardFromLevel } from "../src/engine/board/boardFactory";
import { getBotActionForLevel } from "../src/engine/ai/aiEngine";
import { executeTap, executeFreeze, getTapCostForBox } from "../src/engine/rules/tapRules";
import { checkWinCondition } from "../src/engine/rules/winRules";
import { GameBoard } from "../src/types/board";
import { Player } from "../src/types/game";
import { TurnRuleState } from "../src/engine/rules/moveRules";

interface MatchStats {
  winner: Player | "draw";
  p1CapturedLand: number;
  p2CapturedLand: number;
  p1CapturesCount: number;
  p2CapturesCount: number;
  p1Size4Captures: number;
  p2Size4Captures: number;
  p1Size3Captures: number;
  p2Size3Captures: number;
  p1TapsOnOpponentCapturedBoxes: number;
  p2TapsOnOpponentCapturedBoxes: number;
  p1FreezeCount: number;
  p2FreezeCount: number;
  p1FrozenPlotsConvertedToCapture: number;
  p2FrozenPlotsConvertedToCapture: number;
  totalP1FrozenPlots: number;
  totalP2FrozenPlots: number;
}

function hasBoardChanged(b1: GameBoard, b2: GameBoard): boolean {
  for (const id of Object.keys(b1.boxes)) {
    if (
      b1.boxes[id].count !== b2.boxes[id].count ||
      b1.boxes[id].owner !== b2.boxes[id].owner ||
      b1.boxes[id].frozenBy !== b2.boxes[id].frozenBy
    ) {
      return true;
    }
  }
  return false;
}

function runSingleMatch(
  levelId: string = "campaign-5",
  p1Difficulty: number = 3,
  p2Difficulty: number = 3
): MatchStats {
  const level = VISIBLE_CAMPAIGN_LEVELS.find((l) => l.id === levelId) || VISIBLE_CAMPAIGN_LEVELS[3];
  let board: GameBoard = createBoardFromLevel(level);

  let activePlayer: Player = 1;
  let tapsRemaining = level.defaultTapsPerTurn;
  const tapsPerTurn = level.defaultTapsPerTurn;
  let excludedBoxId: string | null = null;
  let dangerTapCount = 0;
  let dangerTerritoryLinked = false;
  let normalTapUsedThisTurn = false;

  // Track tap spending per box per player to compute wasted taps
  const tapTracker: Record<string, { p1: number; p2: number }> = {};
  for (const boxId of Object.keys(board.boxes)) {
    tapTracker[boxId] = { p1: 0, p2: 0 };
  }

  // Track freeze history
  const frozenByPlayer: Record<string, Player> = {};
  let p1FreezeCount = 0;
  let p2FreezeCount = 0;

  let moveLimit = 400; // Safety turn cap
  let consecutiveNoOps = 0;

  let moveCount = 0;
  while (moveLimit-- > 0) {
    moveCount++;
    const winCheck = checkWinCondition(board);
    if (winCheck.isOver || consecutiveNoOps >= 4) break;

    const action = getBotActionForLevel(
      activePlayer === 1 ? p1Difficulty : p2Difficulty,
      board,
      activePlayer,
      tapsRemaining,
      tapsPerTurn,
      excludedBoxId,
      dangerTapCount,
      dangerTerritoryLinked,
      normalTapUsedThisTurn,
      15 // ultra-fast budget for batch headless simulation
    );

    if (!action) {
      consecutiveNoOps++;
      activePlayer = activePlayer === 1 ? 2 : 1;
      tapsRemaining = tapsPerTurn;
      excludedBoxId = null;
      dangerTapCount = 0;
      dangerTerritoryLinked = false;
      normalTapUsedThisTurn = false;
      continue;
    }

    if (action.type === "freeze") {
      const res = executeFreeze(board, action.row, action.col, activePlayer);
      const changed = hasBoardChanged(board, res.board);
      board = res.board;
      if (changed) {
        consecutiveNoOps = 0;
        const boxId = board.cellMap[action.row]?.[action.col];
        if (boxId) {
          frozenByPlayer[boxId] = activePlayer;
        }
        if (activePlayer === 1) p1FreezeCount++;
        else p2FreezeCount++;
      } else {
        consecutiveNoOps++;
      }

      // Freeze ends turn immediately
      activePlayer = activePlayer === 1 ? 2 : 1;
      tapsRemaining = tapsPerTurn;
      excludedBoxId = null;
      dangerTapCount = 0;
      dangerTerritoryLinked = false;
      normalTapUsedThisTurn = false;
    } else {
      // Tap action
      const boxId = board.cellMap[action.row]?.[action.col];
      const box = boxId ? board.boxes[boxId] : undefined;
      const tapCost = Math.max(1, box ? getTapCostForBox(box, activePlayer) : 1);

      const res = executeTap(board, action.row, action.col, activePlayer);
      const changed = hasBoardChanged(board, res.board);
      board = res.board;

      if (changed) {
        consecutiveNoOps = 0;
        if (boxId) {
          if (activePlayer === 1) tapTracker[boxId].p1 += tapCost;
          else tapTracker[boxId].p2 += tapCost;
        }
      } else {
        consecutiveNoOps++;
      }

      tapsRemaining -= tapCost;
      excludedBoxId = boxId ?? null;
      normalTapUsedThisTurn = true;

      // If move failed to change board, force turn transition to avoid infinite retry loops
      if (!changed || tapsRemaining <= 0) {
        activePlayer = activePlayer === 1 ? 2 : 1;
        tapsRemaining = tapsPerTurn;
        excludedBoxId = null;
        dangerTapCount = 0;
        dangerTerritoryLinked = false;
        normalTapUsedThisTurn = false;
      }
    }
  }

  // Compile final game metrics
  const finalWin = checkWinCondition(board);
  let p1CapturedLand = 0;
  let p2CapturedLand = 0;
  let p1CapturesCount = 0;
  let p2CapturesCount = 0;
  let p1Size4Captures = 0;
  let p2Size4Captures = 0;
  let p1Size3Captures = 0;
  let p2Size3Captures = 0;

  let p1TapsOnOpponentCapturedBoxes = 0;
  let p2TapsOnOpponentCapturedBoxes = 0;

  let p1FrozenPlotsConvertedToCapture = 0;
  let p2FrozenPlotsConvertedToCapture = 0;
  let totalP1FrozenPlots = 0;
  let totalP2FrozenPlots = 0;

  for (const [boxId, freezer] of Object.entries(frozenByPlayer)) {
    if (freezer === 1) totalP1FrozenPlots++;
    else if (freezer === 2) totalP2FrozenPlots++;
  }

  for (const box of Object.values(board.boxes)) {
    if (box.owner === 1) {
      p1CapturedLand += box.size;
      p1CapturesCount++;
      if (box.size === 4) p1Size4Captures++;
      if (box.size === 3) p1Size3Captures++;

      // Player 2 taps spent on Player 1's captured box are wasted
      p2TapsOnOpponentCapturedBoxes += tapTracker[box.id].p2;

      if (frozenByPlayer[box.id] === 1) {
        p1FrozenPlotsConvertedToCapture++;
      }
    } else if (box.owner === 2) {
      p2CapturedLand += box.size;
      p2CapturesCount++;
      if (box.size === 4) p2Size4Captures++;
      if (box.size === 3) p2Size3Captures++;

      // Player 1 taps spent on Player 2's captured box are wasted
      p1TapsOnOpponentCapturedBoxes += tapTracker[box.id].p1;

      if (frozenByPlayer[box.id] === 2) {
        p2FrozenPlotsConvertedToCapture++;
      }
    }
  }

  let winner: Player | "draw" = "draw";
  if (p1CapturedLand > p2CapturedLand) winner = 1;
  else if (p2CapturedLand > p1CapturedLand) winner = 2;

  return {
    winner,
    p1CapturedLand,
    p2CapturedLand,
    p1CapturesCount,
    p2CapturesCount,
    p1Size4Captures,
    p2Size4Captures,
    p1Size3Captures,
    p2Size3Captures,
    p1TapsOnOpponentCapturedBoxes,
    p2TapsOnOpponentCapturedBoxes,
    p1FreezeCount,
    p2FreezeCount,
    p1FrozenPlotsConvertedToCapture,
    p2FrozenPlotsConvertedToCapture,
    totalP1FrozenPlots,
    totalP2FrozenPlots,
  };
}

export function runSimulations(
  numMatches = 10,
  levelId = "campaign-5",
  p1Difficulty = 3,
  p2Difficulty = 3
) {
  console.log(`\n======================================================`);
  console.log(`  STARTING AI vs AI SIMULATION (${numMatches} MATCHES)  `);
  console.log(`  Level: ${levelId} | P1 Difficulty: ${p1Difficulty} vs P2 Difficulty: ${p2Difficulty}  `);
  console.log(`======================================================\n`);

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;

  let totalP1Land = 0;
  let totalP2Land = 0;

  let totalP1Captures = 0;
  let totalP2Captures = 0;

  let totalP1Size4 = 0;
  let totalP2Size4 = 0;
  let totalP1Size3 = 0;
  let totalP2Size3 = 0;

  let totalP1WastedTaps = 0;
  let totalP2WastedTaps = 0;

  let totalP1Freezes = 0;
  let totalP2Freezes = 0;

  let totalP1FreezeConversions = 0;
  let totalP2FreezeConversions = 0;

  for (let i = 1; i <= numMatches; i++) {
    const stats = runSingleMatch(levelId, p1Difficulty, p2Difficulty);

    if (stats.winner === 1) p1Wins++;
    else if (stats.winner === 2) p2Wins++;
    else draws++;

    totalP1Land += stats.p1CapturedLand;
    totalP2Land += stats.p2CapturedLand;

    totalP1Captures += stats.p1CapturesCount;
    totalP2Captures += stats.p2CapturesCount;

    totalP1Size4 += stats.p1Size4Captures;
    totalP2Size4 += stats.p2Size4Captures;
    totalP1Size3 += stats.p1Size3Captures;
    totalP2Size3 += stats.p2Size3Captures;

    totalP1WastedTaps += stats.p1TapsOnOpponentCapturedBoxes;
    totalP2WastedTaps += stats.p2TapsOnOpponentCapturedBoxes;

    totalP1Freezes += stats.p1FreezeCount;
    totalP2Freezes += stats.p2FreezeCount;

    totalP1FreezeConversions += stats.p1FrozenPlotsConvertedToCapture;
    totalP2FreezeConversions += stats.p2FrozenPlotsConvertedToCapture;
  }

  const avg = (val: number) => (val / numMatches).toFixed(2);
  const pct = (val: number, total: number) =>
    total > 0 ? `${((val / total) * 100).toFixed(1)}%` : "0.0%";

  console.log(`MATCH SIMULATION REPORT SUMMARY (${numMatches} Games)`);
  console.log(`------------------------------------------------------`);
  console.log(`Wins Breakdown:`);
  console.log(`   - Player 1 Wins: ${p1Wins} (${pct(p1Wins, numMatches)})`);
  console.log(`   - Player 2 Wins: ${p2Wins} (${pct(p2Wins, numMatches)})`);
  console.log(`   - Draws: ${draws}`);
  console.log(``);

  console.log(`Average Captured Land (Points):`);
  console.log(`   - Player 1: ${avg(totalP1Land)} pts/game`);
  console.log(`   - Player 2: ${avg(totalP2Land)} pts/game`);
  console.log(``);

  console.log(`Captures per Game:`);
  console.log(`   - Player 1: ${avg(totalP1Captures)} plots/game`);
  console.log(`   - Player 2: ${avg(totalP2Captures)} plots/game`);
  console.log(``);

  console.log(`High-Value Multi-Size Plot Captures:`);
  console.log(`   - Size-4 Captures: P1 = ${totalP1Size4} | P2 = ${totalP2Size4}`);
  console.log(`   - Size-3 Captures: P1 = ${totalP1Size3} | P2 = ${totalP2Size3}`);
  console.log(``);

  console.log(`Opponent Captures Conceded / Wasted Taps:`);
  console.log(`   - P1 Taps Spent on Plots Stolen by P2: ${totalP1WastedTaps} total (${avg(totalP1WastedTaps)}/game)`);
  console.log(`   - P2 Taps Spent on Plots Stolen by P1: ${totalP2WastedTaps} total (${avg(totalP2WastedTaps)}/game)`);
  console.log(``);

  console.log(`Freeze & Conversion Tactics:`);
  console.log(`   - Player 1 Freezes: ${totalP1Freezes} (${avg(totalP1Freezes)}/game) | Conversions to Capture: ${totalP1FreezeConversions} (${pct(totalP1FreezeConversions, totalP1Freezes)})`);
  console.log(`   - Player 2 Freezes: ${totalP2Freezes} (${avg(totalP2Freezes)}/game) | Conversions to Capture: ${totalP2FreezeConversions} (${pct(totalP2FreezeConversions, totalP2Freezes)})`);
  console.log(`======================================================\n`);
}

// Run 8 AI vs AI simulation games (Level 2 vs 2)
runSimulations(12, "campaign-6", 2, 2);
