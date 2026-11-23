import { useState, useEffect } from "react";

export function useGameTimer(gameStatus: string) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameStatus === "playing") {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus]);

  const resetTimer = () => setTimer(0);

  return { timer, resetTimer };
}
