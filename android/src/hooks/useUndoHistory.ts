import { useState, useCallback, useRef } from "react";
import { SessionSnapshot } from "../types/session";
import { cloneBoard } from "../engine/board/boardFactory";

function cloneSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    board: cloneBoard(snapshot.board),
    turn: {
      ...snapshot.turn,
      firstTapCoord: snapshot.turn.firstTapCoord
        ? { ...snapshot.turn.firstTapCoord }
        : null,
      dangerTapCount:
        snapshot.turn.dangerTapCount ??
        ((snapshot.turn as { dangerTapUsed?: boolean }).dangerTapUsed ? 1 : 0),
      dangerTerritoryLinked: snapshot.turn.dangerTerritoryLinked ?? false,
    },
    players: {
      player1: {
        resources: { ...snapshot.players.player1.resources },
        powers: { ...snapshot.players.player1.powers },
      },
      player2: {
        resources: { ...snapshot.players.player2.resources },
        powers: { ...snapshot.players.player2.powers },
      },
    },
    lastBotMoves: [...snapshot.lastBotMoves],
  };
}

export function useUndoHistory() {
  const stackRef = useRef<SessionSnapshot[]>([]);
  const [stackSize, setStackSize] = useState(0);

  const pushSnapshot = useCallback((snapshot: SessionSnapshot) => {
    stackRef.current = [...stackRef.current, cloneSnapshot(snapshot)];
    setStackSize(stackRef.current.length);
  }, []);

  const popSnapshot = useCallback((): SessionSnapshot | null => {
    if (stackRef.current.length === 0) return null;
    const newStack = [...stackRef.current];
    const popped = newStack.pop()!;
    stackRef.current = newStack;
    setStackSize(newStack.length);
    return popped;
  }, []);

  const clearHistory = useCallback(() => {
    stackRef.current = [];
    setStackSize(0);
  }, []);

  return {
    pushSnapshot,
    popSnapshot,
    clearHistory,
    canUndo: stackSize > 0,
  };
}
