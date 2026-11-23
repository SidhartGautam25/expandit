import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCampaignLevel,
  getVisibleCampaignLevelByNumber,
  VISIBLE_CAMPAIGN_LEVELS,
} from "../registries/campaignLevels";

const PROGRESS_STORAGE_KEY = "@cascade_grid_campaign_progress_v1";

export interface CampaignProgress {
  completedLevelIds: string[];
  highestUnlocked: number;
}

const INITIAL_PROGRESS: CampaignProgress = {
  completedLevelIds: [],
  highestUnlocked: 1,
};

/** Ensures unlock progress only ever moves forward, never regresses. */
export function normalizeCampaignProgress(
  raw: Partial<CampaignProgress>
): CampaignProgress {
  const completedLevelIds = [...new Set(raw.completedLevelIds ?? [])];
  let highestFromCompleted = 1;

  for (const id of completedLevelIds) {
    const level = getCampaignLevel(id);
    if (level.campaignNumber > 0 && !level.hidden) {
      highestFromCompleted = Math.max(
        highestFromCompleted,
        Math.min(level.campaignNumber + 1, VISIBLE_CAMPAIGN_LEVELS.length)
      );
    }
  }

  const highestUnlocked = Math.max(
    1,
    raw.highestUnlocked ?? 1,
    highestFromCompleted
  );

  return {
    completedLevelIds,
    highestUnlocked: Math.min(highestUnlocked, VISIBLE_CAMPAIGN_LEVELS.length),
  };
}

export function isCampaignLevelUnlocked(
  campaignNumber: number,
  progress: CampaignProgress
): boolean {
  return campaignNumber <= progress.highestUnlocked;
}

export function isCampaignLevelCompleted(
  levelId: string,
  progress: CampaignProgress
): boolean {
  return progress.completedLevelIds.includes(levelId);
}

export function getHighestUnlockedLevelId(progress: CampaignProgress): string {
  const level = getVisibleCampaignLevelByNumber(progress.highestUnlocked);
  return level?.id ?? VISIBLE_CAMPAIGN_LEVELS[0].id;
}

export function useCampaignProgress() {
  const [progress, setProgress] = useState<CampaignProgress>(INITIAL_PROGRESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      const data = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      if (data && data !== "undefined" && data !== "null") {
        const parsed = JSON.parse(data) as Partial<CampaignProgress>;
        setProgress(normalizeCampaignProgress(parsed));
      }
    } catch (e) {
      console.error("Failed to load campaign progress:", e);
    } finally {
      setLoading(false);
    }
  }

  const reloadProgress = useCallback(async () => {
    await loadProgress();
  }, []);

  const saveProgress = useCallback(async (next: CampaignProgress) => {
    const normalized = normalizeCampaignProgress(next);
    try {
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
      setProgress(normalized);
    } catch (e) {
      console.error("Failed to save campaign progress:", e);
    }
  }, []);

  const completeCampaignLevel = useCallback(
    async (levelId: string) => {
      const level = getCampaignLevel(levelId);
      if (!level.campaignNumber || level.hidden) return;

      try {
        const data = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        const isValidData = data && data !== "undefined" && data !== "null";
        const prev = normalizeCampaignProgress(
          isValidData ? (JSON.parse(data) as Partial<CampaignProgress>) : INITIAL_PROGRESS
        );

        const alreadyDone = prev.completedLevelIds.includes(levelId);
        const completedLevelIds = alreadyDone
          ? prev.completedLevelIds
          : [...prev.completedLevelIds, levelId];

        const next = normalizeCampaignProgress({
          completedLevelIds,
          highestUnlocked: Math.max(
            prev.highestUnlocked,
            Math.min(level.campaignNumber + 1, VISIBLE_CAMPAIGN_LEVELS.length)
          ),
        });

        if (
          alreadyDone &&
          next.highestUnlocked === prev.highestUnlocked &&
          next.completedLevelIds.length === prev.completedLevelIds.length
        ) {
          return;
        }

        await saveProgress(next);
      } catch (e) {
        console.error("Failed to complete campaign level:", e);
      }
    },
    [saveProgress]
  );

  const resetProgress = useCallback(async () => {
    await saveProgress(INITIAL_PROGRESS);
  }, [saveProgress]);

  return {
    progress,
    loading,
    completeCampaignLevel,
    resetProgress,
    reloadProgress,
    isUnlocked: (campaignNumber: number) =>
      isCampaignLevelUnlocked(campaignNumber, progress),
    isCompleted: (levelId: string) =>
      isCampaignLevelCompleted(levelId, progress),
    highestUnlockedLevelId: getHighestUnlockedLevelId(progress),
  };
}
