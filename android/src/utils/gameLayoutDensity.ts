export type GameLayoutDensity = "normal" | "compact" | "tight";

export function getGameLayoutDensity(
  screenHeight: number,
  boardRows: number,
  boardCols: number
): GameLayoutDensity {
  const isTallBoard = boardRows > boardCols;
  const aspectPressure = isTallBoard ? boardRows / boardCols : 1;

  if (screenHeight < 700 || (isTallBoard && screenHeight < 760)) {
    return "tight";
  }
  if (screenHeight < 820 || (isTallBoard && screenHeight < 880) || aspectPressure >= 1.25) {
    return "compact";
  }
  return "normal";
}
