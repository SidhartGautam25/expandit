import { Player } from "./game";
import { ResourceBundle } from "./resources";
import { PowerGrant } from "./powers";

export type BoxShapeType =
  | "single"
  | "horizontal"
  | "horizontal3"
  | "vertical"
  | "l-shape"
  | "zigzag"
  | "square"
  | "block3x2";

export interface Coord {
  row: number;
  col: number;
}

export interface BoxDefinition {
  id: string;
  size: number;
  cells: Coord[];
  shape: BoxShapeType;
  rewards?: ResourceBundle;
  powerGrants?: PowerGrant[];
}

export interface GameBox {
  id: string;
  size: number;
  captureThreshold: number;
  cells: Coord[];
  anchor: Coord;
  shape: BoxShapeType;
  count: number;
  owner: Player | null;
  /** Who last built progress on a neutral plot (used for deferred capture) */
  claimedBy: Player | null;
  frozenBy: Player | null;
  rewards?: ResourceBundle;
  powerGrants?: PowerGrant[];
  baseColor: string;
}

export function getCaptureThreshold(size: number): number {
  return size + 2;
}

export function isBoxCaptured(box: GameBox): boolean {
  return box.owner !== null && box.count >= box.captureThreshold;
}

export function isBoxCapturable(box: GameBox): boolean {
  return !isBoxCaptured(box);
}

export function isOneBeforeCapture(box: GameBox): boolean {
  return box.count === box.captureThreshold - 1 && box.owner === null;
}

/** At one click from capture threshold (e.g. shows "2" when threshold is 3) */
export function isDangerPlot(box: GameBox): boolean {
  return isOneBeforeCapture(box);
}

/** At max clicks but not captured — waiting for territory connection */
export function isMaturedOrphan(box: GameBox): boolean {
  return box.owner === null && box.count >= box.captureThreshold;
}
