import { GameBoard } from "./board";
import { Player } from "./game";
import { Coord } from "./box";

export type PowerId =
  | "extra_tap"
  | "steal"
  | "destroy"
  | "freeze";

export type PowerTargeting = "none" | "box";

export interface PowerGrant {
  powerId: PowerId;
  quantity: number;
}

export type PlayerPowers = Record<PowerId, number>;

export function createEmptyPowers(): PlayerPowers {
  return { extra_tap: 0, steal: 0, destroy: 0, freeze: 0 };
}

export interface PowerContext {
  board: GameBoard;
  player: Player;
  target?: Coord;
  tapsPerTurn: number;
}

export interface PowerResult {
  board: GameBoard;
  extraTapsThisTurn?: number;
  message?: string;
}

export interface PowerDefinition {
  id: PowerId;
  name: string;
  description: string;
  icon: string;
  targeting: PowerTargeting;
  apply: (ctx: PowerContext) => PowerResult;
}
