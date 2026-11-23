import { useState, useRef, useEffect, useCallback } from "react";
import { GameBoard, getTotalBoardPoints } from "../types/board";
import { Player, GameStatus } from "../types/game";
import { Coord, isDangerPlot } from "../types/box";
import { TurnState, PlayerState, SessionSnapshot } from "../types/session";
import { PowerId } from "../types/powers";
import { CampaignLevel } from "../types/level";
import {
  createBoardFromLevel,
  executeTap,
  executeFreeze,
  canFreezeBox,
  canInitiateFreezeTurn,
  FREEZE_TAP_COST,
  getTapCostForBox,
  checkWinCondition,
  getBoxAt,
  createMoveContext,
  hasAnyLegalMove,
} from "../engine/gameEngine";
import { isValidTapAction, isValidFreezeTarget } from "../engine/rules/moveRules";
import { isAdjacentToPlayerTerritory } from "../engine/board/boundary";
import { applyCaptureRewards, createInitialPlayerState } from "../engine/rewards/rewardEngine";
import { executePower, getPowerDefinition } from "../registries/powerRegistry";
import { getCampaignLevel } from "../registries/campaignLevels";
import { getBotActionForLevel } from "../engine/ai/aiEngine";
import { getBotThinkDelayMs } from "../constants/levels";
import { RESERVED_CAPTURE_COLORS, PLAYER_CAPTURE_COLORS } from "../constants/theme";
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
  const longPressLockRef = useRef<string | null>(null);
  const freezeReleaseLockUntilRef = useRef(0);
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
      const freshTurn = createTurnState(lvl.defaultTapsPerTurn);
      setTurn(freshTurn);
      turnRef.current = freshTurn;
      const freshPlayers = {
        player1: createInitialPlayerState(),
        player2: createInitialPlayerState(),
      };
      setPlayers(freshPlayers);
      playersRef.current = freshPlayers;
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
      setScores((prev) =>
        prev.player1 === winState.player1Score && prev.player2 === winState.player2Score
          ? prev
          : { player1: winState.player1Score, player2: winState.player2Score }
      );

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

  // Run stalemate / win check once after init or resume — not on every board/score update.
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

          const turn = turnRef.current;
          const action = getBotActionForLevel(
            level.botDifficulty,
            boardRef.current!,
            2,
            turn.tapsRemaining,
            turn.tapsPerTurn,
            turn.firstTapBoxId,
            turn.dangerTapCount,
            turn.dangerTerritoryLinked,
            turn.normalTapUsedThisTurn
          );
          if (action) {
            const shouldContinue =
              action.type === "freeze"
                ? await executeFreezeInternal(action.row, action.col, 2)
                : await executeMoveInternal(action.row, action.col, 2);
            if (shouldContinue) {
              keepThinking = true;
              scheduleBotTurn();
            } else if (
              activePlayerRef.current === 2 &&
              turnRef.current.tapsRemaining > 0
            ) {
              keepThinking = true;
              scheduleBotTurn();
            }
          } else {
            const blocked = await handleWinCheck(
              boardRef.current!,
              2,
              turnRef.current
            );
            if (!blocked) {
              setActivePlayer(1);
              activePlayerRef.current = 1;
              const freshTurn = createTurnState(level.defaultTapsPerTurn);
              setTurn(freshTurn);
              turnRef.current = freshTurn;
            }
          }
        } catch (e) {
          console.error("Bot failed:", e);
        } finally {
          if (!keepThinking) setIsBotThinking(false);
        }
      }, thinkDelayMs);
    },
    [activeGameMode, level.botDifficulty, level.defaultTapsPerTurn, handleWinCheck]
  );

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

  const executeMoveInternal = async (
    row: number,
    col: number,
    player: Player
  ): Promise<boolean> => {
    const currentBoard = boardRef.current;
    if (!currentBoard) return false;

    const tappedBox = getBoxAt(currentBoard, row, col);
    if (!isValidTapAction(currentBoard, row, col, player, turnRef.current)) {
      return false;
    }

    const tapCost = tappedBox ? getTapCostForBox(tappedBox, player) : 1;

    const result = executeTap(currentBoard, row, col, player);
    if (result.board === currentBoard) return false;

    const didCapture =
      result.capturedBoxIds.length > 0 || result.opponentCapturedBoxIds.length > 0;
    playMoveSounds(didCapture);

    const prunePlayerMoves = (
      setMoves: React.Dispatch<React.SetStateAction<Coord[]>>,
      boardState: GameBoard,
      excludeBoxIds: Set<string>
    ) => {
      setMoves((prev) =>
        prev.filter((m) => {
          const id = boardState.cellMap[m.row]?.[m.col];
          return id && !excludeBoxIds.has(id);
        })
      );
    };

    // Add to current turn's taps
    const moveRecord: TurnMoveRecord = { row, col, tapCost, kind: "tap" };
    currentTurnMovesRef.current = [...currentTurnMovesRef.current, { row, col }];
    currentTurnMoveRecordsRef.current = [
      ...currentTurnMoveRecordsRef.current,
      moveRecord,
    ];
    setCurrentTurnMoves(currentTurnMovesRef.current);

    if (tappedBox) {
      const opponentMovesSetter = player === 1 ? setLastPlayer2Moves : setLastPlayer1Moves;
      prunePlayerMoves(opponentMovesSetter, currentBoard, new Set([tappedBox.id]));
    }

    let nextPlayers = { ...playersRef.current };
    if (result.capturedBoxIds.length > 0) {
      const key = player === 1 ? "player1" : "player2";
      nextPlayers = {
        ...nextPlayers,
        [key]: applyCaptureRewards(
          nextPlayers[key],
          result.rewards,
          result.powerGrants
        ),
      };
    }
    if (result.opponentCapturedBoxIds.length > 0) {
      const opponentKey = player === 1 ? "player2" : "player1";
      nextPlayers = {
        ...nextPlayers,
        [opponentKey]: applyCaptureRewards(
          nextPlayers[opponentKey],
          result.opponentRewards,
          result.opponentPowerGrants
        ),
      };
    }
    if (
      result.capturedBoxIds.length > 0 ||
      result.opponentCapturedBoxIds.length > 0
    ) {
      setPlayers(nextPlayers);
      playersRef.current = nextPlayers;
    }

    boardRef.current = result.board;
    setBoard(result.board);

    let nextActive = activePlayerRef.current;
    const remaining = turnRef.current.tapsRemaining - tapCost;

    let dangerTapCount = turnRef.current.dangerTapCount;
    let dangerTerritoryLinked = turnRef.current.dangerTerritoryLinked;
    if (tappedBox && isDangerPlot(tappedBox)) {
      dangerTapCount += 1;
      if (isAdjacentToPlayerTerritory(currentBoard, tappedBox.id, player)) {
        dangerTerritoryLinked = true;
      }
    }

    let nextTurn: TurnState;

    if (remaining <= 0) {
      nextActive = player === 1 ? 2 : 1;

      // Finalize last moves at the end of the turn
      const completedTurnMoves = resolveTurnHighlightCoords(
        currentTurnMoveRecordsRef.current
      );
      if (activeGameMode === "pvp") {
        if (player === 1) {
          setLastPlayer1Moves(completedTurnMoves);
          setLastPlayer2Moves([]);
        } else {
          setLastPlayer2Moves(completedTurnMoves);
          setLastPlayer1Moves([]);
        }
      } else {
        // Bot mode
        if (player === 1) {
          setLastPlayer1Moves(completedTurnMoves);
          setLastPlayer2Moves([]);
        } else {
          setLastPlayer2Moves(completedTurnMoves);
          setLastPlayer1Moves([]);
        }
      }
      currentTurnMovesRef.current = [];
      currentTurnMoveRecordsRef.current = [];
      setCurrentTurnMoves([]);

      nextTurn = createTurnState(turnRef.current.tapsPerTurn);
      setActivePlayer(nextActive);
      activePlayerRef.current = nextActive;
      setTurn(nextTurn);
      turnRef.current = nextTurn;
    } else {
      const boxId = tappedBox?.id ?? null;
      nextTurn = {
        ...turnRef.current,
        tapsRemaining: remaining,
        firstTapCoord: { row, col },
        firstTapBoxId: boxId,
        dangerTapCount,
        dangerTerritoryLinked,
        normalTapUsedThisTurn: true,
      };
      setTurn(nextTurn);
      turnRef.current = nextTurn;
    }

    const playerToCheck = remaining <= 0 ? nextActive : player;
    // End game if the active player has taps left but no legal follow-up (e.g. after 1st of 2 taps).
    const isOver = await handleWinCheck(result.board, playerToCheck, turnRef.current);
    if (isOver) return false;

    if (activeGameMode === "bot" && nextActive === 2) {
      if (turnRef.current.tapsRemaining === turnRef.current.tapsPerTurn) {
        setLastPlayer2Moves([]);
        pushSnapshot(makeSnapshot());
      }
      return true;
    }

    return false;
  };

  const executeFreezeInternal = async (
    row: number,
    col: number,
    player: Player
  ): Promise<boolean> => {
    const currentBoard = boardRef.current;
    if (!currentBoard) return false;

    if (!isValidFreezeTarget(currentBoard, row, col, player, turnRef.current)) {
      return false;
    }

    const tappedBox = getBoxAt(currentBoard, row, col);
    const result = executeFreeze(currentBoard, row, col, player);
    if (result.board === currentBoard) return false;

    playGameSound("tap");
    const moveRecord: TurnMoveRecord = {
      row,
      col,
      tapCost: FREEZE_TAP_COST,
      kind: "freeze",
    };
    currentTurnMovesRef.current = [...currentTurnMovesRef.current, { row, col }];
    currentTurnMoveRecordsRef.current = [
      ...currentTurnMoveRecordsRef.current,
      moveRecord,
    ];
    setCurrentTurnMoves(currentTurnMovesRef.current);

    if (tappedBox) {
      const opponentMovesSetter = player === 1 ? setLastPlayer2Moves : setLastPlayer1Moves;
      setMovesPrune(opponentMovesSetter, currentBoard, new Set([tappedBox.id]));
    }

    boardRef.current = result.board;
    setBoard(result.board);

    const nextActive = player === 1 ? 2 : 1;
    const completedTurnMoves = resolveTurnHighlightCoords(
      currentTurnMoveRecordsRef.current
    );

    if (activeGameMode === "pvp") {
      if (player === 1) {
        setLastPlayer1Moves(completedTurnMoves);
        setLastPlayer2Moves([]);
      } else {
        setLastPlayer2Moves(completedTurnMoves);
        setLastPlayer1Moves([]);
      }
    } else if (player === 1) {
      setLastPlayer1Moves(completedTurnMoves);
      setLastPlayer2Moves([]);
    } else {
      setLastPlayer2Moves(completedTurnMoves);
      setLastPlayer1Moves([]);
    }
    currentTurnMovesRef.current = [];
    currentTurnMoveRecordsRef.current = [];
    setCurrentTurnMoves([]);

    const nextTurn = createTurnState(turnRef.current.tapsPerTurn);
    setActivePlayer(nextActive);
    activePlayerRef.current = nextActive;
    setTurn(nextTurn);
    turnRef.current = nextTurn;
    setPowerMessage(null);

    const isOver = await handleWinCheck(result.board, nextActive, nextTurn);
    if (isOver) return false;

    if (activeGameMode === "bot" && nextActive === 2) {
      setLastPlayer2Moves([]);
      pushSnapshot(makeSnapshot());
      scheduleBotTurn();
      return true;
    }

    return false;
  };

  function setMovesPrune(
    setMoves: React.Dispatch<React.SetStateAction<Coord[]>>,
    boardState: GameBoard,
    excludeBoxIds: Set<string>
  ) {
    setMoves((prev) =>
      prev.filter((m) => {
        const id = boardState.cellMap[m.row]?.[m.col];
        return id && !excludeBoxIds.has(id);
      })
    );
  }

  const handleTileLongPress = async (row: number, col: number) => {
    if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return;
    if (activeGameMode === "bot" && activePlayerRef.current !== 1) return;
    if (targetingMode && selectedPower) return;

    const player = activePlayerRef.current;
    const tappedBox = getBoxAt(boardRef.current, row, col);

    if (!isValidFreezeTarget(boardRef.current, row, col, player, turnRef.current)) {
      playGameSound("invalid");
      return;
    }

    if (tappedBox) {
      longPressLockRef.current = tappedBox.id;
    }
    freezeReleaseLockUntilRef.current = Date.now() + 700;

    const currentTurn = turnRef.current;
    if (activeGameMode === "pvp") {
      pushSnapshot(makeSnapshot());
    } else if (player === 1 && currentTurn.tapsRemaining === currentTurn.tapsPerTurn) {
      pushSnapshot(makeSnapshot());
    }

    await executeFreezeInternal(row, col, player);

    setTimeout(() => {
      longPressLockRef.current = null;
    }, 700);
  };

  const handleTileTap = async (row: number, col: number) => {
    if (gameStatus !== "playing" || isBotThinking || !boardRef.current) return;
    if (activeGameMode === "bot" && activePlayerRef.current !== 1) return;
    if (Date.now() < freezeReleaseLockUntilRef.current) return;

    if (targetingMode && selectedPower) {
      await handlePowerTarget(row, col);
      return;
    }

    const currentTurn = turnRef.current;
    const tappedBox = getBoxAt(boardRef.current, row, col);

    if (tappedBox && longPressLockRef.current === tappedBox.id) {
      return;
    }

    if (!isValidTapAction(boardRef.current, row, col, activePlayerRef.current, currentTurn)) {
      playGameSound("invalid");
      return;
    }

    if (activeGameMode === "pvp") {
      pushSnapshot(makeSnapshot());
    } else if (
      activePlayerRef.current === 1 &&
      currentTurn.tapsRemaining === currentTurn.tapsPerTurn
    ) {
      pushSnapshot(makeSnapshot());
    }

    const shouldBotPlay = await executeMoveInternal(
      row,
      col,
      activePlayerRef.current
    );

    if (activeGameMode === "bot" && shouldBotPlay && gameStatus === "playing") {
      scheduleBotTurn();
    }
  };

  const handlePowerTarget = async (row: number, col: number) => {
    if (!selectedPower) return;
    const def = getPowerDefinition(selectedPower);
    if (!def || def.targeting !== "box") return;

    const playerKey = activePlayer === 1 ? "player1" : "player2";
    if (players[playerKey].powers[selectedPower] <= 0) return;

    if (!boardRef.current) return;

    const result = executePower(selectedPower, {
      board: boardRef.current,
      player: activePlayer,
      target: { row, col },
      tapsPerTurn: turn.tapsPerTurn,
    });

    if (!result) return;

    boardRef.current = result.board;
    setBoard(result.board);
    setPowerMessage(result.message ?? null);

    setPlayers((prev) => ({
      ...prev,
      [playerKey]: {
        ...prev[playerKey],
        powers: {
          ...prev[playerKey].powers,
          [selectedPower]: prev[playerKey].powers[selectedPower] - 1,
        },
      },
    }));

    setSelectedPower(null);
    setTargetingMode(false);
    await handleWinCheck(result.board, activePlayerRef.current, turnRef.current);
  };

  const activatePower = (powerId: PowerId) => {
    if (gameStatus !== "playing" || isBotThinking) return;
    if (activeGameMode === "bot" && activePlayer !== 1) return;

    const playerKey = activePlayer === 1 ? "player1" : "player2";
    if (players[playerKey].powers[powerId] <= 0) return;

    const def = getPowerDefinition(powerId);
    if (!def) return;

    if (def.targeting === "none") {
      if (powerId === "extra_tap") {
        setTurn((prev) => ({
          ...prev,
          tapsPerTurn: prev.tapsPerTurn + 1,
          tapsRemaining: prev.tapsRemaining + 1,
          extraTapActive: true,
        }));
        setPlayers((prev) => ({
          ...prev,
          [playerKey]: {
            ...prev[playerKey],
            powers: {
              ...prev[playerKey].powers,
              extra_tap: prev[playerKey].powers.extra_tap - 1,
            },
          },
        }));
        setPowerMessage("Extra tap activated! +1 click this turn.");
      }
      return;
    }

    setSelectedPower(powerId);
    setTargetingMode(true);
    setPowerMessage(`Select a target for ${def.name}`);
  };

  const cancelPowerTargeting = () => {
    setSelectedPower(null);
    setTargetingMode(false);
    setPowerMessage(null);
  };

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
