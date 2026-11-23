import { BotLevelConfig } from "../types/game";

export const LEVEL_REGISTRY: Record<number, BotLevelConfig> = {
  1: {
    level: 1,
    name: "Novice (Lvl 1)",
    searchDepth: 1,
    blunderRate: 0.60,
    description: "Makes random moves most of the time. Great for learning the basics.",
  },
  2: {
    level: 2,
    name: "Apprentice (Lvl 2)",
    searchDepth: 2,
    blunderRate: 0.35,
    description: "Slightly smarter but still makes occasional mistakes.",
  },
  3: {
    level: 3,
    name: "Tactician (Lvl 3)",
    searchDepth: 3,
    blunderRate: 0.15,
    description: "Thinks ahead to find combinations and double-turn cascades.",
  },
  4: {
    level: 4,
    name: "Strategist (Lvl 4)",
    searchDepth: 4,
    blunderRate: 0.05,
    description: "Highly defensive, plans ahead, and rarely makes mistakes.",
  },
  5: {
    level: 5,
    name: "Master (Lvl 5)",
    searchDepth: 5,
    blunderRate: 0.00,
    description: "Executes deep search trees to capture groups of tiles.",
  },
  6: {
    level: 6,
    name: "Grandmaster (Lvl 6)",
    searchDepth: 6,
    blunderRate: 0.00,
    description: "Analyses multiple sub-turns ahead, playing highly aggressively.",
  },
  7: {
    level: 7,
    name: "DeepMind Neural (Lvl 7)",
    searchDepth: 7,
    blunderRate: 0.00,
    description: "The ultimate challenge. Extremely intelligent agent that foresees complex chains.",
  },
  8: {
    level: 8,
    name: "Freeze Tactician (Lvl 8)",
    searchDepth: 8,
    blunderRate: 0.00,
    description: "Plans freeze traps and punishes wasted taps on locked plots.",
  },
  9: {
    level: 9,
    name: "Grand Strategist (Lvl 9)",
    searchDepth: 9,
    blunderRate: 0.00,
    description: "Deep lookahead across large boards. Rarely leaves a capture or freeze gift.",
  },
  10: {
    level: 10,
    name: "Omega Mind (Lvl 10)",
    searchDepth: 10,
    blunderRate: 0.00,
    description: "Maximum intelligence. Masters territory, freeze chains, and shape timing.",
  },
};

/** Artificial pause before each bot action (ms). Deep levels use less delay because search is slower. */
export function getBotThinkDelayMs(botDifficulty: number): number {
  if (botDifficulty <= 3) return 400;
  if (botDifficulty <= 5) return 250;
  return 50;
}
