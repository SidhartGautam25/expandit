export type ResourceType = "money" | "gold" | "silver";

export type ResourceBundle = Partial<Record<ResourceType, number>>;

export type PlayerResources = Record<ResourceType, number>;

export function createEmptyResources(): PlayerResources {
  return { money: 0, gold: 0, silver: 0 };
}

export function mergeResources(
  base: PlayerResources,
  grant: ResourceBundle
): PlayerResources {
  const result = { ...base };
  for (const key of Object.keys(grant) as ResourceType[]) {
    result[key] = (result[key] ?? 0) + (grant[key] ?? 0);
  }
  return result;
}
