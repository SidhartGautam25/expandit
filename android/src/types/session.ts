import { GameBoard } from "./board";
import { Coord } from "./box";
import { Player, GameStatus } from "./game";
import { PlayerPowers } from "./powers";
import { PlayerResources } from "./resources";

export interface TurnState {
  tapsRemaining: number;
  tapsPerTurn: number;
  firstTapCoord: Coord | null;
  firstTapBoxId: string | null;
  extraTapActive: boolean;
  /** "2" plot taps used this turn (max 2 only when one bordered own captured land) */
  dangerTapCount: number;
  /** True when any "2" tap this turn bordered own captured land */
  dangerTerritoryLinked: boolean;
  /** Set after any normal increment tap — blocks freeze for the rest of the turn */
  normalTapUsedThisTurn: boolean;
}

export interface PlayerState {
  resources: PlayerResources;
  powers: PlayerPowers;
}

export interface GameSessionState {
  board: GameBoard;
  activePlayer: Player;
  scores: { player1: number; player2: number };
  winner: Player | "draw" | null;
  gameStatus: GameStatus;
  turn: TurnState;
  players: { player1: PlayerState; player2: PlayerState };
  selectedPower: string | null;
  targetingMode: boolean;
}

export interface SessionSnapshot {
  board: GameBoard;
  activePlayer: Player;
  scores: { player1: number; player2: number };
  winner: Player | "draw" | null;
  turn: TurnState;
  players: { player1: PlayerState; player2: PlayerState };
  lastBotMoves: Coord[];
}

export interface ActiveSessionSnapshot {
  timestamp: number;
  levelId: string;
  gameMode: "bot" | "pvp";
  player1Color?: "white" | "black";
  board: GameBoard;
  activePlayer: Player;
  scores: { player1: number; player2: number };
  winner: Player | "draw" | null;
  turn: TurnState;
  players: { player1: PlayerState; player2: PlayerState };
  lastPlayer1Moves: Coord[];
  lastPlayer2Moves: Coord[];
  currentTurnMoves: Coord[];
}

