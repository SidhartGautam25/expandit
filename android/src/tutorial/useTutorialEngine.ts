import { useState, useCallback, useMemo } from "react";
import { TUTORIAL_STEPS, TutorialStep } from "./tutorialSteps";
import { Coord } from "../types/box";
import { GameBoard } from "../types/board";
import { createBoardFromLevel, cloneBoard } from "../engine/gameEngine";
import { getCampaignLevel } from "../registries/campaignLevels";
import { Player } from "../types/game";

export interface UseTutorialEngineResult {
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TutorialStep;
  targetCoord: Coord;
  board: GameBoard;
  lastBotMoves: Set<string>;
  canGoPrev: boolean;
  canGoNext: boolean;
  canPerformAction: (row: number, col: number, action: "tap" | "freeze") => boolean;
  handleActionSuccess: (row: number, col: number, action: "tap" | "freeze") => void;
  advanceStep: () => void;
  prevStep: () => void;
  isTutorialComplete: boolean;
}

// Standard 4x4 tutorial board (Steps 1–27)
const INITIAL_TUTORIAL_BOARD: GameBoard = createBoardFromLevel(getCampaignLevel("campaign-0"));

// Specialized board containing 2-box, 3-box, and 4-box plots (Steps 28+)
const MULTI_CELL_TUTORIAL_BOARD: GameBoard = createBoardFromLevel(getCampaignLevel("campaign-8"));

function getBoardForStepIndex(stepIndex: number): GameBoard {
  // Steps 28+ (stepIndex >= 27) switch seamlessly to the Multi-Cell Board!
  if (stepIndex >= 27) {
    return cloneBoard(MULTI_CELL_TUTORIAL_BOARD);
  }

  const board = cloneBoard(INITIAL_TUTORIAL_BOARD);
  const nextBoxes = { ...board.boxes };

  const setBoxState = (
    r: number,
    c: number,
    count: number,
    owner: Player | null,
    frozenBy: Player | null = null
  ) => {
    for (const box of Object.values(nextBoxes)) {
      if (box.cells.some((cell) => cell.row === r && cell.col === c)) {
        nextBoxes[box.id] = { ...box, count, owner, frozenBy };
        break;
      }
    }
  };

  // Cumulative state applied according to stepIndex (threshold = 3)
  if (stepIndex >= 1) setBoxState(1, 1, 1, null);
  if (stepIndex >= 2) setBoxState(1, 2, 1, null);
  if (stepIndex >= 3) setBoxState(2, 3, 1, null);
  if (stepIndex >= 4) setBoxState(2, 2, 1, null);
  if (stepIndex >= 5) setBoxState(1, 1, 2, null);
  if (stepIndex >= 6) setBoxState(1, 2, 2, null);
  if (stepIndex >= 7) setBoxState(2, 3, 2, null);
  if (stepIndex >= 8) setBoxState(2, 2, 2, null);
  if (stepIndex >= 9) setBoxState(1, 1, 3, 1); // Captured Blue!
  if (stepIndex >= 10) setBoxState(1, 2, 3, 1); // Captured Blue!
  if (stepIndex >= 11) setBoxState(2, 3, 3, 2); // Captured Red!
  if (stepIndex >= 12) setBoxState(2, 2, 3, 2); // Captured Red!

  // Contested boundary plot (2,1):
  if (stepIndex >= 13) setBoxState(2, 1, 2, null);
  if (stepIndex >= 15) setBoxState(2, 1, 3, 2); // Bot tap turns plot (2,1) count = 3, owner = Red

  // 2-Territory Expansion (0,3) & Max 2-Territory Cap (3,0):
  if (stepIndex === 15) setBoxState(0, 3, 2, null);
  if (stepIndex >= 16) setBoxState(0, 3, 3, 1); // User tap turns plot (0,3) count = 3, owner = 1 (Blue 2nd territory!)

  if (stepIndex === 17) setBoxState(3, 0, 2, null);
  if (stepIndex >= 18) setBoxState(3, 0, 3, null); // User tap turns plot (3,0) count = 3, owner = null (Uncaptured due to 2-territory cap)

  // Double Count-2 Plot Rules (Steps 20–22, stepIndex 19–21)
  if (stepIndex >= 19) {
    setBoxState(0, 1, 2, null);
    setBoxState(0, 2, 2, null);
  }
  if (stepIndex >= 20) {
    setBoxState(0, 1, 3, 1); // Tap 1 captures plot (0,1) in Blue!
  }
  if (stepIndex >= 21) {
    setBoxState(0, 2, 3, 1); // Tap 2 captures plot (0,2) in Blue!
  }

  // Freeze mechanics (Steps 23–25, stepIndex 22–24)
  if (stepIndex >= 22) {
    setBoxState(1, 3, 2, null); // Plot (1,3) starts at count 2 (uncaptured, touching TWO Blue plots: (0,3) and (1,2))
  }
  if (stepIndex >= 23) {
    setBoxState(1, 3, 2, null, 1); // Long press freezes plot (1,3) at count 2 (frozenBy Blue)
  }
  if (stepIndex >= 24) {
    setBoxState(1, 3, 3, 1, null); // Tap frozen increases count from 2 to 3, converting to normal captured Blue plot!
  }

  // Decapture mechanics (Steps 26–27, stepIndex 25–26)
  if (stepIndex >= 26) setBoxState(1, 2, 2, null); // Decaptured from 3 to 2!

  return { ...board, boxes: nextBoxes };
}

export function useTutorialEngine(onComplete?: () => void): UseTutorialEngineResult {
  const [stepIdx, setStepIdx] = useState(0);

  const currentStep = TUTORIAL_STEPS[stepIdx] ?? TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];

  const board = useMemo(() => getBoardForStepIndex(stepIdx), [stepIdx]);

  const lastBotMoves = useMemo(() => {
    const set = new Set<string>();
    if (stepIdx === 3 || stepIdx === 7 || stepIdx === 11) set.add("box-(2,3)");
    if (stepIdx === 4 || stepIdx === 8 || stepIdx === 12) set.add("box-(2,2)");
    if (stepIdx === 15) set.add("box-(2,1)");
    return set;
  }, [stepIdx]);

  const isTargetBox = useCallback(
    (row: number, col: number) => {
      return (
        currentStep.targetCoord.row === row &&
        currentStep.targetCoord.col === col
      );
    },
    [currentStep]
  );

  const canPerformAction = useCallback(
    (row: number, col: number, action: "tap" | "freeze") => {
      if (currentStep.actionType === "read") return false;
      return isTargetBox(row, col) && currentStep.actionType === action;
    },
    [currentStep, isTargetBox]
  );

  const advanceStep = useCallback(() => {
    if (stepIdx < TUTORIAL_STEPS.length - 1) {
      setStepIdx((prev) => prev + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [stepIdx, onComplete]);

  const prevStep = useCallback(() => {
    if (stepIdx > 0) {
      setStepIdx((prev) => prev - 1);
    }
  }, [stepIdx]);

  const handleActionSuccess = useCallback(
    (row: number, col: number, action: "tap" | "freeze") => {
      if (!isTargetBox(row, col) || currentStep.actionType !== action) return;

      if (stepIdx < TUTORIAL_STEPS.length - 1) {
        setStepIdx((prev) => prev + 1);
      } else if (onComplete) {
        onComplete();
      }
    },
    [isTargetBox, currentStep, stepIdx, onComplete]
  );

  return {
    currentStepIndex: stepIdx,
    totalSteps: TUTORIAL_STEPS.length,
    currentStep,
    targetCoord: currentStep.targetCoord,
    board,
    lastBotMoves,
    canGoPrev: stepIdx > 0,
    canGoNext: stepIdx < TUTORIAL_STEPS.length - 1,
    canPerformAction,
    handleActionSuccess,
    advanceStep,
    prevStep,
    isTutorialComplete: stepIdx >= TUTORIAL_STEPS.length - 1,
  };
}
