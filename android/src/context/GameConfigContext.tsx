import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeCampaignLevelId } from "../registries/campaignLevels";

const CONFIG_STORAGE_KEY = "@cascade_grid_config_v4";

export interface GameConfig {
  gameMode: "bot" | "pvp";
  campaignLevelId: string;
  player1Color: "white" | "black";
}

const DEFAULT_CONFIG: GameConfig = {
  gameMode: "bot",
  campaignLevelId: "campaign-1",
  player1Color: "white",
};

function parseStoredConfig(raw: string): GameConfig {
  if (!raw || raw === "undefined" || raw === "null") {
    return DEFAULT_CONFIG;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_CONFIG;
    }
    return {
      ...DEFAULT_CONFIG,
      gameMode: parsed.gameMode ?? DEFAULT_CONFIG.gameMode,
      campaignLevelId: normalizeCampaignLevelId(
        parsed.campaignLevelId ?? DEFAULT_CONFIG.campaignLevelId
      ),
      player1Color: parsed.player1Color ?? DEFAULT_CONFIG.player1Color,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function buildUpdatedConfig(
  prev: GameConfig,
  newConfig: Partial<GameConfig>
): GameConfig {
  return {
    ...prev,
    ...newConfig,
    ...(newConfig.campaignLevelId
      ? {
          campaignLevelId: normalizeCampaignLevelId(newConfig.campaignLevelId),
        }
      : {}),
  };
}

interface GameConfigContextValue {
  config: GameConfig;
  loading: boolean;
  updateConfig: (newConfig: Partial<GameConfig>) => Promise<void>;
  reloadConfig: () => Promise<void>;
}

const GameConfigContext = createContext<GameConfigContextValue | null>(null);

export function GameConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      if (data) {
        setConfig(parseStoredConfig(data));
        return;
      }

      const legacy = await AsyncStorage.getItem("@cascade_grid_config_v3");
      if (legacy) {
        const migrated = parseStoredConfig(legacy);
        setConfig(migrated);
        await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch (e) {
      console.error("Failed to load game config:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(async (newConfig: Partial<GameConfig>) => {
    let updated!: GameConfig;
    setConfig((prev) => {
      updated = buildUpdatedConfig(prev, newConfig);
      return updated;
    });
    try {
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save game config:", e);
    }
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
      updateConfig,
      reloadConfig: loadConfig,
    }),
    [config, loading, updateConfig, loadConfig]
  );

  return (
    <GameConfigContext.Provider value={value}>{children}</GameConfigContext.Provider>
  );
}

export function useGameConfig() {
  const context = useContext(GameConfigContext);
  if (!context) {
    throw new Error("useGameConfig must be used within GameConfigProvider");
  }
  return context;
}
