export type Player = 1 | 2;

export type GameStatus = "idle" | "playing" | "paused" | "game_over";

export interface Move {
  row: number;
  col: number;
  player: Player;
}

export interface LevelStats {
  levelId: string;
  levelName: string;
  gamesPlayed: number;
  wins: number;
  bestCapturePercent: number; // Max land capture percentage achieved on victory (0-100)
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  levelId: string;
  levelName: string;
  gameMode: "bot" | "pvp";
  winner: Player | "draw";
  player1Score: number;
  player2Score: number;
  totalBoardPoints: number;
  player1CapturePercent: number;
}

export interface SaveMatchParams {
  winner: Player | "draw";
  levelId: string;
  levelName: string;
  gameMode: "bot" | "pvp";
  player1Score: number;
  player2Score: number;
  totalBoardPoints: number;
}

export interface GameStats {
  gamesPlayed: number;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  levelStats?: Record<string, LevelStats>;
  history?: MatchRecord[];
}

export interface BotLevelConfig {
  level: number;
  name: string;
  searchDepth: number;
  blunderRate: number;
  description: string;
}

/** @deprecated Use GameBoard from types/board.ts */
export interface TileState {
  id: string;
  row: number;
  col: number;
  count: number;
  owner: Player | null;
}

/** @deprecated Use GameBoard from types/board.ts */
export type BoardState = TileState[][];
