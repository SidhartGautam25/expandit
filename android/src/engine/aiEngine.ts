import { BoardState, Player } from "../types/game";
import { getValidMoves, checkWinCondition, executeTap } from "./cascadeEngine";
import { LEVEL_REGISTRY } from "../constants/levels";

let nodeCount = 0;
const MAX_NODES = 30000;

/**
 * Heuristically evaluates the board state.
 */
function evaluateBoard(grid: BoardState, player: Player): number {
  const opponent = player === 1 ? 2 : 1;
  let playerOwnedCount = 0;
  let opponentOwnedCount = 0;
  const gridSize = grid.length;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tile = grid[r][c];
      if (tile.count === 3) {
        if (tile.owner === player) {
          playerOwnedCount++;
        } else if (tile.owner === opponent) {
          opponentOwnedCount++;
        }
      }
    }
  }

  let score = (playerOwnedCount - opponentOwnedCount) * 15;

  // Add win/loss terminal state weights
  const totalTiles = gridSize * gridSize;
  if (playerOwnedCount + opponentOwnedCount === totalTiles) {
    if (playerOwnedCount > opponentOwnedCount) {
      return 20000 + (playerOwnedCount - opponentOwnedCount);
    }
    if (opponentOwnedCount > playerOwnedCount) {
      return -20000 - (opponentOwnedCount - playerOwnedCount);
    }
    return 0; // Draw
  }

  return score;
}

/**
 * Minimax with Alpha-Beta pruning, move ordering, and double-tap turn tracking.
 */
function minimax(
  grid: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Player,
  maximizingPlayer: Player,
  tapsRemaining: number,
  firstTapCoord: { row: number; col: number } | null
): { score: number; move: { row: number; col: number } | null } {
  nodeCount++;

  const winState = checkWinCondition(grid);
  if (depth === 0 || winState.isOver || nodeCount >= MAX_NODES) {
    return { score: evaluateBoard(grid, maximizingPlayer), move: null };
  }

  let moves = getValidMoves(grid, tapsRemaining, firstTapCoord);

  if (moves.length === 0) {
    return { score: evaluateBoard(grid, maximizingPlayer), move: null };
  }

  // Move ordering: prioritize captures (which happen at count 2)
  moves.sort((a, b) => {
    const aCount = grid[a.row][a.col].count;
    const bCount = grid[b.row][b.col].count;
    const aIsCapture = aCount === 2 ? 1 : 0;
    const bIsCapture = bCount === 2 ? 1 : 0;
    
    if (aIsCapture !== bIsCapture) {
      return bIsCapture - aIsCapture;
    }
    return bCount - aCount;
  });

  let bestMove: { row: number; col: number } | null = null;

  if (currentPlayer === maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { nextBoard, extraTurn } = executeTap(grid, move.row, move.col, currentPlayer);
      
      let nextPlayer = currentPlayer;
      let nextTaps = 2;
      let nextFirstTap: { row: number; col: number } | null = null;
      
      if (extraTurn) {
        nextTaps = 2;
        nextPlayer = currentPlayer;
        nextFirstTap = null;
      } else {
        if (tapsRemaining === 2) {
          nextTaps = 1;
          nextPlayer = currentPlayer;
          nextFirstTap = { row: move.row, col: move.col };
        } else {
          nextTaps = 2;
          nextPlayer = currentPlayer === 1 ? 2 : 1;
          nextFirstTap = null;
        }
      }

      const evalResult = minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        nextPlayer,
        maximizingPlayer,
        nextTaps,
        nextFirstTap
      );
      
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) {
        break; // Beta cut-off
      }
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { nextBoard, extraTurn } = executeTap(grid, move.row, move.col, currentPlayer);
      
      let nextPlayer = currentPlayer;
      let nextTaps = 2;
      let nextFirstTap: { row: number; col: number } | null = null;
      
      if (extraTurn) {
        nextTaps = 2;
        nextPlayer = currentPlayer;
        nextFirstTap = null;
      } else {
        if (tapsRemaining === 2) {
          nextTaps = 1;
          nextPlayer = currentPlayer;
          nextFirstTap = { row: move.row, col: move.col };
        } else {
          nextTaps = 2;
          nextPlayer = currentPlayer === 1 ? 2 : 1;
          nextFirstTap = null;
        }
      }

      const evalResult = minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        nextPlayer,
        maximizingPlayer,
        nextTaps,
        nextFirstTap
      );
      
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) {
        break; // Alpha cut-off
      }
    }
    return { score: minEval, move: bestMove };
  }
}

/**
 * Calculates the best move for the AI bot given difficulty and current taps status.
 */
export function getBotMoveForLevel(
  levelNumber: number,
  grid: BoardState,
  botPlayer: Player = 2,
  tapsRemaining: number = 2,
  firstTapCoord: { row: number; col: number } | null = null
): { row: number; col: number } | null {
  const config = LEVEL_REGISTRY[levelNumber] || LEVEL_REGISTRY[1];
  let validMoves = getValidMoves(grid, tapsRemaining, firstTapCoord);

  if (validMoves.length === 0) {
    return null;
  }

  // Determine if bot should blunder
  const isBlunder = Math.random() < config.blunderRate;
  if (isBlunder) {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  nodeCount = 0;
  const result = minimax(
    grid,
    config.searchDepth,
    -Infinity,
    Infinity,
    botPlayer,
    botPlayer,
    tapsRemaining,
    firstTapCoord
  );

  if (result.move) {
    return result.move;
  } else {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
}
