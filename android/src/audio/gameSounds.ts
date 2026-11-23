import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

export type GameSoundId = "tap" | "capture" | "win" | "loss" | "invalid";

const SOUND_SOURCES: Record<GameSoundId, number> = {
  tap: require("../../assets/sounds/tap.wav"),
  capture: require("../../assets/sounds/capture.wav"),
  win: require("../../assets/sounds/win.wav"),
  loss: require("../../assets/sounds/loss.wav"),
  invalid: require("../../assets/sounds/invalid.wav"),
};

const VOLUMES: Record<GameSoundId, number> = {
  tap: 0.55,
  capture: 0.8,
  win: 0.9,
  loss: 0.85,
  invalid: 0.65,
};

const players: Partial<Record<GameSoundId, AudioPlayer>> = {};
let initPromise: Promise<void> | null = null;

export function initGameSounds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        });

        (Object.keys(SOUND_SOURCES) as GameSoundId[]).forEach((id) => {
          const player = createAudioPlayer(SOUND_SOURCES[id]);
          player.volume = VOLUMES[id];
          players[id] = player;
        });
      } catch (error) {
        console.warn("Failed to initialize game sounds:", error);
      }
    })();
  }
  return initPromise;
}

export function playGameSound(id: GameSoundId): void {
  void initGameSounds().then(() => {
    const player = players[id];
    if (!player) return;

    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn(`Failed to play ${id} sound:`, error);
    }
  });
}

export function playMoveSounds(captured: boolean): void {
  playGameSound("tap");
  if (captured) {
    playGameSound("capture");
  }
}

export function playOutcomeSound(winner: 1 | 2 | "draw" | null): void {
  if (winner === 1) {
    playGameSound("win");
  } else if (winner === 2) {
    playGameSound("loss");
  }
}
