import { BoxDefinition, BoxShapeType } from "./box";

/** Declarative recipe for building a campaign stage — add new entries to extend the campaign. */
export interface CampaignPlacement {
  id: string;
  anchor: { row: number; col: number };
  shape: BoxShapeType;
  extras?: Partial<Pick<BoxDefinition, "rewards" | "powerGrants">>;
}

export interface CampaignBlueprint {
  id: string;
  campaignNumber: number;
  name: string;
  description: string;
  rows: number;
  cols: number;
  botDifficulty: number;
  /** Multi-cell shapes placed before singles fill the rest. Omit for a classic uniform grid. */
  placements?: CampaignPlacement[];
  defaultTapsPerTurn?: number;
  showResources?: boolean;
  showPowers?: boolean;
  /** Hidden levels stay in the registry but are excluded from the main campaign UI. */
  hidden?: boolean;
}
