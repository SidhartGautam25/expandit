export { executeTap, executeFreeze, canFreezeBox, canInitiateFreezeTurn, FREEZE_TAP_COST, isFrozenPlot, isOwnFrozenPlot, getTapCostForBox, isCaptureMove } from "./rules/tapRules";
export { getValidMoves, isValidTapTarget, isValidTapAction, isValidFreezeTarget, isSelfAttackMove, isTappableBox, createMoveContext, hasAnyLegalMove, isMidTurn } from "./rules/moveRules";
export type { MoveContext, TurnRuleState } from "./rules/moveRules";
export { checkWinCondition, computeScores } from "./rules/winRules";
export {
  createBoardFromLevel,
  cloneBoard,
  getBoxAt,
  getCellDisplayState,
  makeBoxDef,
  fillGridWithSingles,
} from "./board/boardFactory";
export { getBotMoveForLevel, getBotActionForLevel } from "./ai/aiEngine";
export type { BotAction } from "./ai/aiEngine";
