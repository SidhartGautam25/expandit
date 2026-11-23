import { useState, useCallback } from "react";
import { TurnState } from "../types/session";

export function createTurnState(tapsPerTurn: number): TurnState {
  return {
    tapsRemaining: tapsPerTurn,
    tapsPerTurn,
    firstTapCoord: null,
    firstTapBoxId: null,
    extraTapActive: false,
    dangerTapCount: 0,
    dangerTerritoryLinked: false,
    normalTapUsedThisTurn: false,
  };
}

export function useTurnState(initialTapsPerTurn: number) {
  const [turn, setTurn] = useState<TurnState>(() => createTurnState(initialTapsPerTurn));

  const resetTurn = useCallback(
    (tapsPerTurn?: number) => {
      setTurn(createTurnState(tapsPerTurn ?? turn.tapsPerTurn));
    },
    [turn.tapsPerTurn]
  );

  return { turn, setTurn, resetTurn };
}
