import { BoxDefinition } from "./box";

export interface CampaignLevel {
  id: string;
  /** 1-based stage number in the main campaign (0 = legacy/hidden) */
  campaignNumber: number;
  name: string;
  description: string;
  rows: number;
  cols: number;
  boxes: BoxDefinition[];
  defaultTapsPerTurn: number;
  botDifficulty: number;
  /** Always show resource bar (even at 0) */
  showResources?: boolean;
  /** Always show power bar hint */
  showPowers?: boolean;
  /** Excluded from main campaign UI (treasure/power legacy levels) */
  hidden?: boolean;
}
