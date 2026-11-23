import { GameBoard } from "./board";
import { Coord } from "./box";
import { Player } from "./game";
import { ResourceBundle } from "./resources";
import { PowerGrant } from "./powers";

export interface TapResult {
  board: GameBoard;
  capturedBoxIds: string[];
  /** Plots auto-absorbed by the other player when an orphan touches their territory */
  opponentCapturedBoxIds: string[];
  extraTurn: boolean;
  rewards: ResourceBundle;
  powerGrants: PowerGrant[];
  opponentRewards: ResourceBundle;
  opponentPowerGrants: PowerGrant[];
}

export interface WinState {
  isOver: boolean;
  winner: Player | "draw" | null;
  player1Score: number;
  player2Score: number;
  totalBoxes: number;
}

export interface ValidMove {
  row: number;
  col: number;
  boxId: string;
}
