import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { Direction } from "../../types/box";
import { LEVEL_REGISTRY } from "../../constants/levels";
import { getAllLegalMoves, LegalMove } from "../board/blockEngine";
import { getRowTerritoryZone, getMidlineRow } from "../board/territoryRules";

export type BotAction =
  | { type: "tap"; row: number; col: number }
  | { type: "spawn"; row: number; col: number }
  | { type: "expand"; boxId: string; direction: Direction }
  | { type: "freeze"; row: number; col: number };

export function getBotActionForLevel(
  levelNumber: number,
  board: GameBoard,
  botPlayer: Player = 2,
  _tapsRemaining: number = 2,
  _tapsPerTurn: number = 2,
  _excludedBoxId: string | null = null,
  _dangerTapCount: number = 0,
  _dangerTerritoryLinked: boolean = false,
  _normalTapUsedThisTurn: boolean = false,
  _timeBudgetMs: number = 700
): BotAction | null {
  const config = LEVEL_REGISTRY[levelNumber] || LEVEL_REGISTRY[1];
  const legalMoves = getAllLegalMoves(board, botPlayer);

  if (legalMoves.length === 0) {
    return null;
  }

  const midline = getMidlineRow(board.rows);

  // Score each legal move
  const scoredMoves = legalMoves.map((move) => {
    let score = 0;

    if (move.type === "expand" && move.boxId && move.direction) {
      const box = board.boxes[move.boxId];
      if (!box) return { move, score: -100 };

      // Number of cells gained by expanding
      const cellGain =
        move.direction === "up" || move.direction === "down" ? box.width : box.height;
      score += cellGain * 15;

      // Bonus for pushing toward / into opponent territory across midline
      if (botPlayer === 2) {
        if (move.direction === "up") {
          const targetRow = box.row - 1;
          if (targetRow < midline) {
            score += 30; // Unlocking territory in player 1 half!
          } else {
            score += 15; // Moving closer to midline
          }
        }
      } else {
        if (move.direction === "down") {
          const targetRow = box.row + box.height;
          if (targetRow >= midline) {
            score += 30; // Unlocking territory in player 2 half!
          } else {
            score += 15;
          }
        }
      }

      // Small bonus for expanding larger blocks
      score += box.size * 2;
    } else if (move.type === "spawn" && move.row !== undefined && move.col !== undefined) {
      score += 10;
      const zone = getRowTerritoryZone(board, move.row);
      if (zone === "neutral") {
        score += 25; // High priority to claim newly unlocked neutral ground!
      } else {
        // Preference for spawning near the front line (midline)
        const distToMidline = Math.abs(move.row - midline);
        score += (board.rows - distToMidline) * 2;
      }
    }

    // Add tiny jitter to avoid deterministic tie loops
    score += Math.random() * 2;

    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);

  let chosenMove: LegalMove;

  // Blunder check based on level config
  if (Math.random() < config.blunderRate && scoredMoves.length > 1) {
    // Pick a random move among available
    const randomIndex = Math.floor(Math.random() * Math.min(scoredMoves.length, 5));
    chosenMove = scoredMoves[randomIndex].move;
  } else {
    chosenMove = scoredMoves[0].move;
  }

  if (chosenMove.type === "expand" && chosenMove.boxId && chosenMove.direction) {
    return {
      type: "expand",
      boxId: chosenMove.boxId,
      direction: chosenMove.direction,
    };
  }

  return {
    type: "spawn",
    row: chosenMove.row ?? 0,
    col: chosenMove.col ?? 0,
  };
}

export function getBotMoveForLevel(
  levelNumber: number,
  board: GameBoard,
  botPlayer: Player = 2,
  tapsRemaining: number = 2
): { row: number; col: number } | null {
  const action = getBotActionForLevel(levelNumber, board, botPlayer, tapsRemaining);
  if (!action) return null;
  if (action.type === "spawn" || action.type === "tap") {
    return { row: action.row, col: action.col };
  }
  const box = board.boxes[action.boxId];
  return box ? { row: box.anchor.row, col: box.anchor.col } : null;
}
