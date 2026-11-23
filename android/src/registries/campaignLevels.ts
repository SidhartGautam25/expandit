import { CampaignLevel } from "../types/level";
import { BoxDefinition } from "../types/box";
import { CampaignBlueprint } from "../types/campaignBlueprint";
import { fillGridWithSingles, makeBoxDef } from "../engine/board/boardFactory";
import { CAMPAIGN_BLUEPRINTS } from "./campaignBlueprints";

function buildLevelFromBlueprint(blueprint: CampaignBlueprint): CampaignLevel {
  if (!blueprint.placements || blueprint.placements.length === 0) {
    return {
      id: blueprint.id,
      campaignNumber: blueprint.campaignNumber,
      name: blueprint.name,
      description: blueprint.description,
      rows: blueprint.rows,
      cols: blueprint.cols,
      boxes: fillGridWithSingles(blueprint.rows, blueprint.cols, blueprint.id),
      defaultTapsPerTurn: blueprint.defaultTapsPerTurn ?? 2,
      botDifficulty: blueprint.botDifficulty,
      showResources: blueprint.showResources,
      showPowers: blueprint.showPowers,
      hidden: blueprint.hidden,
    };
  }

  const occupied = new Set<string>();
  const boxes: BoxDefinition[] = [];

  for (const p of blueprint.placements) {
    const def = makeBoxDef(p.id, p.anchor, p.shape, p.extras);
    let valid = true;
    for (const c of def.cells) {
      if (
        c.row < 0 ||
        c.col < 0 ||
        c.row >= blueprint.rows ||
        c.col >= blueprint.cols ||
        occupied.has(`${c.row}-${c.col}`)
      ) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    for (const c of def.cells) occupied.add(`${c.row}-${c.col}`);
    boxes.push(def);
  }

  for (let r = 0; r < blueprint.rows; r++) {
    for (let c = 0; c < blueprint.cols; c++) {
      if (!occupied.has(`${r}-${c}`)) {
        boxes.push(makeBoxDef(`s-${r}-${c}`, { row: r, col: c }, "single"));
      }
    }
  }

  return {
    id: blueprint.id,
    campaignNumber: blueprint.campaignNumber,
    name: blueprint.name,
    description: blueprint.description,
    rows: blueprint.rows,
    cols: blueprint.cols,
    boxes,
    defaultTapsPerTurn: blueprint.defaultTapsPerTurn ?? 2,
    botDifficulty: blueprint.botDifficulty,
    showResources: blueprint.showResources,
    showPowers: blueprint.showPowers,
    hidden: blueprint.hidden,
  };
}

function buildLegacyLevel(
  id: string,
  name: string,
  description: string,
  rows: number,
  cols: number,
  placements: Array<{
    id: string;
    anchor: { row: number; col: number };
    shape: import("../types/box").BoxShapeType;
    extras?: Parameters<typeof makeBoxDef>[3];
  }>,
  options: { botDifficulty?: number; showResources?: boolean; showPowers?: boolean } = {}
): CampaignLevel {
  return buildLevelFromBlueprint({
    id,
    campaignNumber: 0,
    name,
    description,
    rows,
    cols,
    botDifficulty: options.botDifficulty ?? 3,
    placements,
    showResources: options.showResources,
    showPowers: options.showPowers,
    hidden: true,
  });
}

/** Visible main campaign — built from declarative blueprints */
export const VISIBLE_CAMPAIGN_LEVELS: CampaignLevel[] = CAMPAIGN_BLUEPRINTS.map(
  buildLevelFromBlueprint
);

/** Legacy special levels — logic kept, hidden from UI until re-enabled */
const treasureHunt = buildLegacyLevel(
  "treasure-hunt",
  "Treasure Hunt",
  "Boxes with 💵🥇🥈 icons drop resources when captured. Bigger boxes = bigger loot!",
  6,
  6,
  [
    { id: "t-gold-1", anchor: { row: 0, col: 0 }, shape: "single", extras: { rewards: { gold: 10 } } },
    { id: "t-money-1", anchor: { row: 0, col: 1 }, shape: "single", extras: { rewards: { money: 15 } } },
    { id: "t-silver-1", anchor: { row: 0, col: 2 }, shape: "single", extras: { rewards: { silver: 8 } } },
    { id: "t-chest-1", anchor: { row: 0, col: 3 }, shape: "vertical", extras: { rewards: { gold: 12, silver: 6 } } },
    { id: "t-vault-1", anchor: { row: 0, col: 4 }, shape: "horizontal", extras: { rewards: { money: 20, gold: 5 } } },
    { id: "t-gold-2", anchor: { row: 1, col: 0 }, shape: "single", extras: { rewards: { gold: 10 } } },
    { id: "t-money-2", anchor: { row: 1, col: 1 }, shape: "single", extras: { rewards: { money: 15 } } },
    { id: "t-silver-2", anchor: { row: 1, col: 2 }, shape: "single", extras: { rewards: { silver: 8 } } },
    { id: "t-chest-2", anchor: { row: 1, col: 4 }, shape: "vertical", extras: { rewards: { gold: 12, silver: 6 } } },
    { id: "t-vault-2", anchor: { row: 2, col: 0 }, shape: "horizontal", extras: { rewards: { money: 20, gold: 5 } } },
    { id: "t-jackpot-1", anchor: { row: 2, col: 2 }, shape: "l-shape", extras: { rewards: { money: 25, gold: 15, silver: 10 } } },
    { id: "t-gem-1", anchor: { row: 3, col: 0 }, shape: "single", extras: { rewards: { gold: 20 } } },
    { id: "t-chest-3", anchor: { row: 3, col: 4 }, shape: "vertical", extras: { rewards: { gold: 12, silver: 6 } } },
    { id: "t-chest-4", anchor: { row: 2, col: 5 }, shape: "vertical", extras: { rewards: { gold: 12, silver: 6 } } },
    { id: "t-vault-3", anchor: { row: 4, col: 0 }, shape: "horizontal", extras: { rewards: { money: 20, gold: 5 } } },
    { id: "t-jackpot-2", anchor: { row: 4, col: 2 }, shape: "l-shape", extras: { rewards: { money: 25, gold: 15, silver: 10 } } },
    { id: "t-gem-2", anchor: { row: 5, col: 0 }, shape: "single", extras: { rewards: { gold: 20 } } },
  ],
  { botDifficulty: 3, showResources: true }
);

const powerPlay = buildLegacyLevel(
  "power-play",
  "Power Play",
  "Capture boxes with ⚡🔄💥❄️ icons to unlock powers. Use them from the power bar!",
  6,
  6,
  [
    { id: "p-extra-1", anchor: { row: 0, col: 0 }, shape: "single", extras: { powerGrants: [{ powerId: "extra_tap", quantity: 1 }] } },
    { id: "p-steal-1", anchor: { row: 0, col: 1 }, shape: "single", extras: { powerGrants: [{ powerId: "steal", quantity: 1 }] } },
    { id: "p-destroy-1", anchor: { row: 0, col: 2 }, shape: "single", extras: { powerGrants: [{ powerId: "destroy", quantity: 1 }] } },
    { id: "p-freeze-1", anchor: { row: 0, col: 3 }, shape: "single", extras: { powerGrants: [{ powerId: "freeze", quantity: 1 }] } },
    { id: "p-extra-2", anchor: { row: 0, col: 4 }, shape: "single", extras: { powerGrants: [{ powerId: "extra_tap", quantity: 1 }] } },
    { id: "p-steal-2", anchor: { row: 0, col: 5 }, shape: "single", extras: { powerGrants: [{ powerId: "steal", quantity: 1 }] } },
    { id: "p-combo-1", anchor: { row: 2, col: 0 }, shape: "horizontal", extras: { powerGrants: [{ powerId: "extra_tap", quantity: 1 }, { powerId: "freeze", quantity: 1 }], rewards: { gold: 5 } } },
    { id: "p-ultimate-1", anchor: { row: 2, col: 2 }, shape: "square", extras: { powerGrants: [{ powerId: "steal", quantity: 1 }, { powerId: "destroy", quantity: 1 }] } },
    { id: "p-combo-2", anchor: { row: 2, col: 4 }, shape: "vertical", extras: { powerGrants: [{ powerId: "extra_tap", quantity: 1 }, { powerId: "steal", quantity: 1 }] } },
    { id: "p-combo-3", anchor: { row: 4, col: 0 }, shape: "zigzag", extras: { powerGrants: [{ powerId: "destroy", quantity: 1 }, { powerId: "freeze", quantity: 1 }] } },
    { id: "p-ultimate-2", anchor: { row: 4, col: 2 }, shape: "l-shape", extras: { powerGrants: [{ powerId: "steal", quantity: 1 }, { powerId: "extra_tap", quantity: 1 }] } },
    { id: "p-combo-4", anchor: { row: 4, col: 4 }, shape: "vertical", extras: { powerGrants: [{ powerId: "freeze", quantity: 1 }, { powerId: "destroy", quantity: 1 }] } },
  ],
  { botDifficulty: 4, showPowers: true, showResources: true }
);

/** @deprecated Use VISIBLE_CAMPAIGN_LEVELS — kept for backwards compatibility */
export const CAMPAIGN_LEVELS = VISIBLE_CAMPAIGN_LEVELS;

export const ALL_CAMPAIGN_LEVELS: CampaignLevel[] = [
  ...VISIBLE_CAMPAIGN_LEVELS,
  treasureHunt,
  powerPlay,
];

const CAMPAIGN_LEVEL_MAP: Record<string, CampaignLevel> = Object.fromEntries(
  ALL_CAMPAIGN_LEVELS.map((l) => [l.id, l])
);

const LEGACY_ID_MAP: Record<string, string> = {
  "classic-grid": "campaign-1",
  "mixed-shapes": "campaign-10",
  "treasure-hunt": "campaign-1",
  "power-play": "campaign-1",
};

export function normalizeCampaignLevelId(id: string): string {
  return LEGACY_ID_MAP[id] ?? id;
}

export function getCampaignLevel(id: string): CampaignLevel {
  const normalized = normalizeCampaignLevelId(id);
  return CAMPAIGN_LEVEL_MAP[normalized] ?? VISIBLE_CAMPAIGN_LEVELS[0];
}

export function getCampaignLevelByIndex(index: number): CampaignLevel {
  return VISIBLE_CAMPAIGN_LEVELS[index] ?? VISIBLE_CAMPAIGN_LEVELS[0];
}

export function getVisibleCampaignLevelByNumber(
  campaignNumber: number
): CampaignLevel | undefined {
  return VISIBLE_CAMPAIGN_LEVELS.find((l) => l.campaignNumber === campaignNumber);
}

/** Re-export legacy levels for engine/tests that reference them directly */
export { treasureHunt, powerPlay };
