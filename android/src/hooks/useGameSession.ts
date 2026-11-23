import { useState, useRef, useEffect, useCallback } from "react";
import { GameBoard, getTotalBoardPoints } from "../types/board";
import { Player, GameStatus } from "../types/game";
import { Coord, Direction } from "../types/box";
import { TurnState, PlayerState, SessionSnapshot } from "../types/session";
import { PowerId } from "../types/powers";
import { CampaignLevel } from "../types/level";
import {
  createBoardFromLevel,
  checkWinCondition,
  computeScores,
  getBoxAt,
  hasAnyLegalMove,
  canPlayerSpawnAt,
  canExpandBlock,
  executeSpawnBlock,
  executeExpandBlock,
  getBotActionForLevel,
} from "../engine/gameEngine";
import { createInitialPlayerState } from "../engine/rewards/rewardEngine";
import { getCampaignLevel } from "../registries/campaignLevels";
import { getBotThinkDelayMs } from "../constants/levels";
import { PLAYER_CAPTURE_COLORS } from "../constants/theme";
import { createTurnState } from "./useTurnState";
import { useGameTimer } from "./useGameTimer";
import { useUndoHistory } from "./useUndoHistory";
import { useGameHistory } from "./useGameHistory";
import { useGameConfig } from "./useGameConfig";
import { useCampaignProgress } from "./useCampaignProgress";
import { playMoveSounds, playOutcomeSound, playGameSound } from "../audio/gameSounds";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
} from "../services/sessionStorage";
import { getTurnHighlightCoords, resolveTurnHighlightCoords } from "../utils/lastMove";
import type { TurnMoveRecord } from "../utils/lastMove";

export function useGameSession(options?: {
  isResume?: boolean;
  startupLevelId?: string;
  startupGameMode?: "bot" | "pvp";
}) {
  const { stats, saveMatch, clearStats } = useGameHistory();
  const { config, updateConfig, loading: configLoading } = useGameConfig();
  const { completeCampaignLevel } = useCampaignProgress();

  const [activeLevelId, setActiveLevelId] = useState<string>(
    () => options?.startupLevelId ?? config.campaignLevelId ?? "campaign-1"
  );
  const [activeGameMode, setActiveGameMode] = useState<"bot" | "pvp">(
    () => options?.startupGameMode ?? config.gameMode ?? "bot"
  );
  const level = getCampaignLevel(activeLevelId);

  const prevStartupLevelIdRef = useRef(options?.startupLevelId);

  useEffect(() => {
    if (options?.startupLevelId !== prevStartupLevelIdRef.current) {
      prevStartupLevelIdRef.current = options?.startupLevelId;
      if (options?.startupLevelId && options.startupLevelId !== activeLevelId) {
        setActiveLevelId(options.startupLevelId);
      }
      return;
    }
    if (configLoading) return;
    if (!options?.startupLevelId && config.campaignLevelId !== activeLevelId) {
      setActiveLevelId(config.campaignLevelId);
    }
  }, [options?.startupLevelId, configLoading, config.campaignLevelId, activeLevelId]);

  useEffect(() => {
    if (options?.startupGameMode) return;
    if (configLoading) return;
    if (config.gameMode !== activeGameMode) {
      setActiveGameMode(config.gameMode);
    }
  }, [options?.startupGameMode, configLoading, config.gameMode, activeGameMode]);

  const [board, setBoard] = useState<GameBoard | null>(null);
  const [activePlayer, setActivePlayer] = useState<Player>(1);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [turn, setTurn] = useState<TurnState>(() => createTurnState(2));
  const [players, setPlayers] = useState<{
    player1: PlayerState;
    player2: PlayerState;
  }>({
    player1: createInitialPlayerState(),
    player2: createInitialPlayerState(),
  });

  // Territorial Block-Extrusion interactive selection & directional controls
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [targetingMode, setTargetingMode] = useState(false);
  const [powerMessage, setPowerMessage] = useState<string | null>(null);
  const [lastPlayer1Moves, setLastPlayer1Moves] = useState<Coord[]>([]);
  const [lastPlayer2Moves, setLastPlayer2Moves] = useState<Coord[]>([]);
  const [currentTurnMoves, setCurrentTurnMoves] = useState<Coord[]>([]);

  const boardRef = useRef<GameBoard | null>(null);
  const activePlayerRef = useRef(activePlayer);
  const turnRef = useRef(turn);
  const playersRef = useRef(players);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedSessionKeyRef = useRef<string | null>(null);
  const winnerRef = useRef<Player | "draw" | null>(null);
  const currentTurnMovesRef = useRef<Coord[]>([]);
  const currentTurnMoveRecordsRef = useRef<TurnMoveRecord[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [initCheckToken, setInitCheckToken] = useState(0);

  const { timer, resetTimer } = useGameTimer(gameStatus);
  const { pushSnapshot, popSnapshot, clearHistory, canUndo } = useUndoHistory();

  const initializeFromLevel = useCallback(
    (lvl: CampaignLevel) => {
      const activeP1Color =
        config.player1Color === "black"
          ? PLAYER_CAPTURE_COLORS.player2
          : PLAYER_CAPTURE_COLORS.player1;
      const activeP2Color =
        config.player1Color === "black"
          ? PLAYER_CAPTURE_COLORS.player1
          : PLAYER_CAPTURE_COLORS.player2;
      const newBoard = createBoardFromLevel(lvl, {
        reservedColors: [activeP1Color, activeP2Color],
      });
      boardRef.current = newBoard;
      setBoard(newBoard);
      setActivePlayer(1);
      activePlayerRef.current = 1;
      setScores({ player1: 0, player2: 0 });
      setWinner(null);
      winnerRef.current = null;
      setGameStatus("playing");
      const freshTurn = createTurnState(lvl.defaultTapsPerTurn ?? 2);
      setTurn(freshTurn);
      turnRef.current = freshTurn;
      const freshPlayers = {
        player1: createInitialPlayerState(),
        player2: createInitialPlayerState(),
      };
      setPlayers(freshPlayers);
      playersRef.current = freshPlayers;
      setSelectedBoxId(null);
      setSelectedDirection(null);
      setFeedbackMessage(null);
      setSelectedPower(null);
      setTargetingMode(false);
      setPowerMessage(null);
      setLastPlayer1Moves([]);
      setLastPlayer2Moves([]);
      currentTurnMovesRef.current = [];
      currentTurnMoveRecordsRef.current = [];
      setCurrentTurnMoves([]);
      setIsBotThinking(false);
      clearHistory();
      resetTimer();
      loadedSessionKeyRef.current = `${lvl.id}:${activeGameMode}`;
      void clearSessionSnapshot();
      setInitCheckToken((token) => token + 1);
    },
    [clearHistory, resetTimer, config.player1Color, activeGameMode]
  );

  const restoreActiveSession = useCallback(async () => {
    const snap = await loadSessionSnapshot();
    const targetLevel = getCampaignLevel(activeLevelId);
    const canRestore =
      snap &&
      snap.winner === null &&
      snap.levelId === activeLevelId &&
      snap.gameMode === activeGameMode;

    if (!canRestore) {
      if (snap) await clearSessionSnapshot();
      initializeFromLevel(targetLevel);
      return;
    }

    boardRef.current = snap.board;
    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    activePlayerRef.current = snap.activePlayer;
    setScores(snap.scores);
    setWinner(snap.winner);
    setGameStatus("playing");
    setTurn(snap.turn);
    turnRef.current = snap.turn;
    setPlayers(snap.players);
    playersRef.current = snap.players;
    setLastPlayer1Moves(getTurnHighlightCoords(snap.lastPlayer1Moves || []));
    setLastPlayer2Moves(getTurnHighlightCoords(snap.lastPlayer2Moves || []));
    setCurrentTurnMoves(snap.currentTurnMoves || []);
    setIsBotThinking(false);
    clearHistory();
    resetTimer();
    loadedSessionKeyRef.current = `${snap.levelId}:${snap.gameMode}`;
    setInitCheckToken((token) => token + 1);
  }, [clearHistory, resetTimer, activeLevelId, activeGameMode, initializeFromLevel]);

  const startFreshGame = useCallback(async () => {
    const targetLevel = getCampaignLevel(activeLevelId);
    const snap = await loadSessionSnapshot();
    if (
      snap &&
      snap.winner === null &&
      (snap.levelId !== activeLevelId || snap.gameMode !== activeGameMode)
    ) {
      await clearSessionSnapshot();
    }

    const sessionKey = `${activeLevelId}:${activeGameMode}`;
    const currentBoard = boardRef.current;
    if (
      loadedSessionKeyRef.current === sessionKey &&
      currentBoard &&
      currentBoard.rows === targetLevel.rows &&
      currentBoard.cols === targetLevel.cols
    ) {
      return;
    }

    initializeFromLevel(targetLevel);
  }, [activeLevelId, activeGameMode, initializeFromLevel]);

  useEffect(() => {
    const hasCompleteStartup = Boolean(
      options?.startupLevelId && options?.startupGameMode
    );
    if (configLoading && !hasCompleteStartup) return;

    if (options?.isResume) {
      void restoreActiveSession();
      return;
    }

    void startFreshGame();
  }, [
    configLoading,
    activeLevelId,
    activeGameMode,
    options?.isResume,
    options?.startupGameMode,
    restoreActiveSession,
    startFreshGame,
  ]);

  // Move-based Auto Save effect
  useEffect(() => {
    if (!board || winner !== null) return;
    void saveSessionSnapshot({
      timestamp: Date.now(),
      levelId: activeLevelId,
      gameMode: activeGameMode,
      player1Color: config.player1Color,
      board,
      activePlayer,
      scores,
      winner,
      turn,
      players,
      lastPlayer1Moves,
      lastPlayer2Moves,
      currentTurnMoves,
    });
  }, [
    board,
    activePlayer,
    scores,
    winner,
    turn,
    players,
    lastPlayer1Moves,
    lastPlayer2Moves,
    currentTurnMoves,
    activeLevelId,
    activeGameMode,
    config.player1Color,
  ]);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { activePlayerRef.current = activePlayer; }, [activePlayer]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  const makeSnapshot = useCallback(
    (): SessionSnapshot => ({
      board: boardRef.current!,
      activePlayer: activePlayerRef.current,
      scores,
      winner,
      turn: turnRef.current,
      players: playersRef.current,
      lastBotMoves: activePlayerRef.current === 1 ? lastPlayer2Moves : lastPlayer1Moves,
    }),
    [scores, winner, lastPlayer1Moves, lastPlayer2Moves]
  );

  const restoreSnapshot = useCallback((snap: SessionSnapshot) => {
    boardRef.current = snap.board;
    setBoard(snap.board);
    setActivePlayer(snap.activePlayer);
    setScores(snap.scores);
    setWinner(snap.winner);
    setTurn(snap.turn);
    turnRef.current = snap.turn;
    setPlayers(snap.players);
    if (snap.activePlayer === 1) {
      setLastPlayer2Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer1Moves([]);
    } else {
      setLastPlayer1Moves(getTurnHighlightCoords(snap.lastBotMoves));
      setLastPlayer2Moves([]);
    }
    setCurrentTurnMoves([]);
    setSelectedBoxId(null);
    setSelectedDirection(null);
    if (snap.winner === null) setGameStatus("playing");
  }, []);

  const handleWinCheck = useCallback(
    async (
      nextBoard: GameBoard,
      playerToCheck?: Player,
      turnToCheck?: TurnState
    ) => {
      if (winnerRef.current !== null) return true;

      const winState = checkWinCondition(nextBoard);
      setScores({ player1: winState.player1Score, player2: winState.player2Score });

      let outcome = winState;

      if (
        !outcome.isOver &&
        playerToCheck !== undefined &&
        turnToCheck &&
        !hasAnyLegalMove(nextBoard, playerToCheck, turnToCheck)
      ) {
        let textWinner: Player | "draw" = "draw";
        if (winState.player1Score > winState.player2Score) textWinner = 1;
        else if (winState.player2Score > winState.player1Score) textWinner = 2;
        outcome = { ...winState, isOver: true, winner: textWinner };
      }

      if (outcome.isOver) {
        if (winnerRef.current !== null) return true;
        winnerRef.current = outcome.winner;
        setWinner(outcome.winner);
        setGameStatus("game_over");
        playOutcomeSound(outcome.winner);
        const totalBoardPoints = getTotalBoardPoints(nextBoard);
        await saveMatch({
          winner: outcome.winner ?? "draw",
          levelId: activeLevelId,
          levelName: level.name || `Level ${level.campaignNumber}`,
          gameMode: activeGameMode,
          player1Score: outcome.player1Score,
          player2Score: outcome.player2Score,
          totalBoardPoints,
        });
        await clearSessionSnapshot();
        if (
          activeGameMode === "bot" &&
          outcome.winner === 1 &&
          level.campaignNumber > 0 &&
          !level.hidden
        ) {
          await completeCampaignLevel(level.id);
          const nextLevelNumber = level.campaignNumber + 1;
          const nextLevelId = `campaign-${nextLevelNumber}`;
          updateConfig({ campaignLevelId: nextLevelId });
        }
        return true;
      }
      return false;
    },
    [
      saveMatch,
      activeGameMode,
      level.id,
      level.campaignNumber,
      level.hidden,
      completeCampaignLevel,
      updateConfig,
    ]
  );

  const handleWinCheckRef = useRef(handleWinCheck);
  handleWinCheckRef.current = handleWinCheck;

  useEffect(() => {
    if (initCheckToken === 0) return;
    const currentBoard = boardRef.current;
    if (!currentBoard) return;
    void handleWinCheckRef.current(
      currentBoard,
      activePlayerRef.current,
      turnRef.current
    );
  }, [initCheckToken]);

  // Turn advance helper: consumes 1 tap and updates or switches turns
  const completeActionAndAdvance = useCallback(
    async (
      nextBoard: GameBoard,
      player: Player,
      actionCells: Coord[],
      actionKind: "spawn" | "expand"
    ) => {
      boardRef.current = nextBoard;
      setBoard(nextBoard);

      const computed = computeScores(nextBoard);
      setScores(computed);

      // Record move coords for turn visual highlights
      const moveRecord: TurnMoveRecord = {
        row: actionCells[0]?.row ?? 0,
        col: actionCells[0]?.col ?? 0,
        tapCost: 1,
        kind: "tap",
      };
      currentTurnMovesRef.current = [...currentTurnMovesRef.current, ...actionCells];
      currentTurnMoveRecordsRef.current = [
        ...currentTurnMoveRecordsRef.current,
        moveRecord,
      ];
      setCurrentTurnMoves(currentTurnMovesRef.current);

      const remaining = turnRef.current.tapsRemaining - 1;
      let nextActive = activePlayerRef.current;
      let nextTurn: TurnState;

      if (remaining <= 0) {
        nextActive = player === 1 ? 2 : 1;
        const completedTurnMoves = resolveTurnHighlightCoords(
          currentTurnMoveRecordsRef.current
        );

        if (player === 1) {
          setLastPlayer1Moves(completedTurnMoves);
          setLastPlayer2Moves([]);
        } else {
          setLastPlayer2Moves(completedTurnMoves);
          setLastPlayer1Moves([]);
        }

        currentTurnMovesRef.current = [];
        currentTurnMoveRecordsRef.current = [];
        setCurrentTurnMoves([]);

        nextTurn = createTurnState(turnRef.current.tapsPerTurn);
        setActivePlayer(nextActive);
        activePlayerRef.current = nextActive;
        setTurn(nextTurn);
        turnRef.current = nextTurn;
        setSelectedBoxId(null);
        setSelectedDirection(null);
      } else {
        nextTurn = {
          ...turnRef.current,
          tapsRemaining: remaining,
          firstTapCoord: actionCells[0] ?? null,
          normalTapUsedThisTurn: true,
        };
        setTurn(nextTurn);
        turnRef.current = nextTurn;
      }

      const playerToCheck = remaining <= 0 ? nextActive : player;
      const isOver = await handleWinCheck(nextBoard, playerToCheck, turnRef.current);
      if (isOver) return false;

      // In bot mode, if it's now Bot's turn, signal to schedule
      return activeGameMode === "bot" && nextActive === 2;
    },
    [activeGameMode, handleWinCheck]
  );

  // Execute Expand Action for a block
  const handleExpandBlock = useCallback(
    async (boxId: string, direction: Direction): Promise<boolean> => {
      if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return false;
      const player = activePlayerRef.current;
      if (activeGameMode === "bot" && player !== 1) return false;

      const currentBoard = boardRef.current;
      if (!canExpandBlock(currentBoard, boxId, direction, player)) {
        playGameSound("invalid");
        setFeedbackMessage("Cannot expand: direction is blocked or out of bounds!");
        return false;
      }

      pushSnapshot(makeSnapshot());
      const result = executeExpandBlock(currentBoard, boxId, direction, player);
      if (!result.success) {
        playGameSound("invalid");
        return false;
      }

      playGameSound("capture");
      setFeedbackMessage(null);

      const shouldBotPlay = await completeActionAndAdvance(
        result.board,
        player,
        result.addedCells,
        "expand"
      );

      if (shouldBotPlay && gameStatus === "playing") {
        scheduleBotTurn();
      }

      return true;
    },
    [gameStatus, isBotThinking, activeGameMode, makeSnapshot, pushSnapshot, completeActionAndAdvance]
  );

  // Bot Turn Scheduler
  const scheduleBotTurn = useCallback(() => {
    if (activeGameMode !== "bot") return;

    const thinkDelayMs = getBotThinkDelayMs(level.botDifficulty);
    setIsBotThinking(true);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

    botTimeoutRef.current = setTimeout(async () => {
      let keepThinking = false;
      try {
        if (activePlayerRef.current !== 2 || winnerRef.current !== null) {
          return;
        }

        const currentBoard = boardRef.current;
        if (!currentBoard) return;

        const action = getBotActionForLevel(
          level.botDifficulty,
          currentBoard,
          2,
          turnRef.current.tapsRemaining
        );

        if (action) {
          if (action.type === "expand" && action.boxId && action.direction) {
            const result = executeExpandBlock(currentBoard, action.boxId, action.direction, 2);
            if (result.success) {
              playGameSound("capture");
              const shouldContinue = await completeActionAndAdvance(
                result.board,
                2,
                result.addedCells,
                "expand"
              );
              if (shouldContinue && activePlayerRef.current === 2 && turnRef.current.tapsRemaining > 0) {
                keepThinking = true;
                scheduleBotTurn();
              }
            }
          } else {
            // Spawn action
            const row = action.type === "spawn" ? action.row : (action as any).row;
            const col = action.type === "spawn" ? action.col : (action as any).col;
            const result = executeSpawnBlock(currentBoard, row, col, 2);
            if (result.success) {
              playGameSound("tap");
              const shouldContinue = await completeActionAndAdvance(
                result.board,
                2,
                [{ row, col }],
                "spawn"
              );
              if (shouldContinue && activePlayerRef.current === 2 && turnRef.current.tapsRemaining > 0) {
                keepThinking = true;
                scheduleBotTurn();
              }
            }
          }
        } else {
          // No legal move for bot: check win or pass
          await handleWinCheck(currentBoard, 2, turnRef.current);
        }
      } catch (e) {
        console.error("Bot turn error:", e);
      } finally {
        if (!keepThinking) setIsBotThinking(false);
      }
    }, thinkDelayMs);
  }, [activeGameMode, level.botDifficulty, completeActionAndAdvance, handleWinCheck]);

  useEffect(() => {
    if (configLoading || !board || activeGameMode !== "bot") return;
    if (gameStatus !== "playing" || winner !== null) return;
    if (activePlayer !== 2 || isBotThinking) return;

    const kickTimer = setTimeout(() => {
      if (activePlayerRef.current !== 2) return;
      if (winnerRef.current !== null) return;
      scheduleBotTurn();
    }, 150);

    return () => clearTimeout(kickTimer);
  }, [
    activePlayer,
    isBotThinking,
    gameStatus,
    winner,
    board,
    activeGameMode,
    configLoading,
    scheduleBotTurn,
  ]);

  // Main tile tap handler
  const handleTileTap = async (row: number, col: number) => {
    if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return;
    const player = activePlayerRef.current;
    if (activeGameMode === "bot" && player !== 1) return;

    const currentBoard = boardRef.current;
    const boxId = currentBoard.cellMap[row]?.[col];

    // Case 1: Tapping an empty cell -> SPAWN 1x1 block
    if (!boxId) {
      if (!canPlayerSpawnAt(currentBoard, row, col, player)) {
        playGameSound("invalid");
        setFeedbackMessage("Cannot spawn in opponent's territory! Spawn in your territory or neutral zone.");
        return;
      }

      pushSnapshot(makeSnapshot());
      const result = executeSpawnBlock(currentBoard, row, col, player);
      if (!result.success) {
        playGameSound("invalid");
        return;
      }

      playGameSound("tap");
      setFeedbackMessage(null);
      setSelectedBoxId(null);
      setSelectedDirection(null);

      const shouldBotPlay = await completeActionAndAdvance(
        result.board,
        player,
        [{ row, col }],
        "spawn"
      );

      if (shouldBotPlay && gameStatus === "playing") {
        scheduleBotTurn();
      }
      return;
    }

    // Case 2: Tapping an occupied cell
    const box = currentBoard.boxes[boxId];
    if (!box) return;

    // Subcase 2A: Tapping opponent's block
    if (box.owner !== player) {
      playGameSound("invalid");
      setFeedbackMessage("Opponent's block! Cannot be selected or grown.");
      return;
    }

    // Subcase 2B: Tapping owned block
    // If a direction was already chosen (Choose Direction -> Select Block mode):
    if (selectedDirection !== null) {
      if (!canExpandBlock(currentBoard, boxId, selectedDirection, player)) {
        playGameSound("invalid");
        setFeedbackMessage(`Cannot expand ${selectedDirection.toUpperCase()}: path is blocked!`);
        setSelectedBoxId(boxId); // Select it so player sees valid arrows
        return;
      }

      pushSnapshot(makeSnapshot());
      const result = executeExpandBlock(currentBoard, boxId, selectedDirection, player);
      if (!result.success) {
        playGameSound("invalid");
        return;
      }

      playGameSound("capture");
      setFeedbackMessage(null);
      setSelectedBoxId(boxId);

      const shouldBotPlay = await completeActionAndAdvance(
        result.board,
        player,
        result.addedCells,
        "expand"
      );

      if (shouldBotPlay && gameStatus === "playing") {
        scheduleBotTurn();
      }
      return;
    }

    // Otherwise, toggle selection of this block (Select Block -> Choose Direction mode)
    playGameSound("tap");
    setFeedbackMessage(null);
    setSelectedBoxId((prev) => (prev === boxId ? null : boxId));
  };

  const handleTileLongPress = (_row: number, _col: number) => {
    // Preserved for interface compatibility
  };

  const activatePower = (_powerId: PowerId) => {};
  const cancelPowerTargeting = () => {};

  const handleUndo = () => {
    if (!canUndo || isBotThinking) return;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setIsBotThinking(false);
    const snap = popSnapshot();
    if (snap) restoreSnapshot(snap);
  };

  const resetGame = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    loadedSessionKeyRef.current = null;
    initializeFromLevel(getCampaignLevel(activeLevelId));
  };

  const loadLevel = (newLevelId: string) => {
    prevStartupLevelIdRef.current = newLevelId;
    setActiveLevelId(newLevelId);
    updateConfig({ campaignLevelId: newLevelId });
    loadedSessionKeyRef.current = null;
    initializeFromLevel(getCampaignLevel(newLevelId));
  };

  return {
    board,
    activePlayer,
    scores,
    winner,
    gameStatus,
    gameMode: activeGameMode,
    turn,
    players,
    selectedBoxId,
    setSelectedBoxId,
    selectedDirection,
    setSelectedDirection,
    feedbackMessage,
    handleExpandBlock,
    selectedPower,
    targetingMode,
    powerMessage,
    lastBotMoves: activePlayer === 1 ? lastPlayer2Moves : lastPlayer1Moves,
    isBotThinking,
    timer,
    level,
    handleTileTap,
    handleTileLongPress,
    activatePower,
    cancelPowerTargeting,
    resetGame,
    loadLevel,
    handleUndo,
    canUndo: canUndo && !isBotThinking,
    config,
    updateConfig,
    configLoading: configLoading || board === null,
    historyStats: stats,
    clearHistory: clearStats,
    totalBoxes: board ? getTotalBoardPoints(board) : 0,
    player1ColorHex:
      config.player1Color === "black"
        ? PLAYER_CAPTURE_COLORS.player2
        : PLAYER_CAPTURE_COLORS.player1,
    player2ColorHex:
      config.player1Color === "black"
        ? PLAYER_CAPTURE_COLORS.player1
        : PLAYER_CAPTURE_COLORS.player2,
  };
}
