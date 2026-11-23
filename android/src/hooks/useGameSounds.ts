import { useEffect } from "react";
import { initGameSounds } from "../audio/gameSounds";

/** Preloads game SFX when the app mounts. */
export function useGameSounds() {
  useEffect(() => {
    void initGameSounds();
  }, []);
}
