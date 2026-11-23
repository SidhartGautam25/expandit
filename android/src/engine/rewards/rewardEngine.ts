import { ResourceBundle } from "../../types/resources";
import { PowerGrant } from "../../types/powers";
import { PlayerState } from "../../types/session";
import { mergeResources } from "../../types/resources";
import { createEmptyPowers } from "../../types/powers";

export function applyCaptureRewards(
  playerState: PlayerState,
  rewards: ResourceBundle,
  powerGrants: PowerGrant[]
): PlayerState {
  const nextResources = mergeResources(playerState.resources, rewards);
  const nextPowers = { ...playerState.powers };

  for (const grant of powerGrants) {
    nextPowers[grant.powerId] = (nextPowers[grant.powerId] ?? 0) + grant.quantity;
  }

  return { resources: nextResources, powers: nextPowers };
}

export function createInitialPlayerState(): PlayerState {
  return {
    resources: { money: 0, gold: 0, silver: 0 },
    powers: createEmptyPowers(),
  };
}
