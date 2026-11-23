import { ResourceType } from "../types/resources";
import { palette } from "../constants/theme";

export interface ResourceMeta {
  id: ResourceType;
  name: string;
  icon: string;
  color: string;
}

export const RESOURCE_META: Record<ResourceType, ResourceMeta> = {
  money: { id: "money", name: "Money", icon: "💵", color: palette.resource.money },
  gold: { id: "gold", name: "Gold", icon: "🥇", color: palette.resource.gold },
  silver: { id: "silver", name: "Silver", icon: "🥈", color: palette.resource.silver },
};
