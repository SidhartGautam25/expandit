import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useGameConfig } from "../hooks/useGameConfig";
import { useCampaignProgress } from "../hooks/useCampaignProgress";
import { getCampaignLevel } from "../registries/campaignLevels";
import { PlayButton } from "../components/ui/PlayButton";
import { AppLoadingScreen } from "../components/ui/AppLoadingScreen";
import {
  CircleActionButton,
  GearIcon,
  StatsIcon,
} from "../components/ui/CircleActionButton";
import { TYPOGRAPHY, COLORS, MODAL_UI } from "../constants/theme";
import {
  loadSessionSnapshot,
  clearSessionSnapshot,
} from "../services/sessionStorage";
import { ActiveSessionSnapshot } from "../types/session";

const HOME_BACKGROUND = require("../../assets/home/background.png");
const HOME_TITLE = require("../../assets/home/title.png");
const HOME_CHARACTER = require("../../assets/home/character.png");

/** Reserved height for corner buttons + padding so play never overlaps them */
const BOTTOM_BAR_HEIGHT = 72;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  /*
   * Tablet / iPad detection.
   *
   * Using the shorter dimension means:
   * - iPad portrait  -> 768 x 1024 -> tablet
   * - iPad landscape -> 1024 x 768 -> tablet
   * - normal phones  -> usually < 600 -> unchanged
   */
  const isTablet = Math.min(width, height) >= 600;

  const { config, loading, updateConfig, reloadConfig } = useGameConfig();
  const [activeSession, setActiveSession] =
    useState<ActiveSessionSnapshot | null>(null);

  const {
    progress,
    loading: progressLoading,
    highestUnlockedLevelId,
    reloadProgress,
  } = useCampaignProgress();

  useFocusEffect(
    React.useCallback(() => {
      void reloadProgress();
      void reloadConfig();

      void loadSessionSnapshot().then((session) => {
        if (session && session.winner === null) {
          setActiveSession(session);
        } else {
          setActiveSession(null);
        }
      });
    }, [reloadProgress, reloadConfig])
  );

  const campaignLevel = getCampaignLevel(
    config.campaignLevelId ?? "campaign-1"
  );

  useEffect(() => {
    if (loading || progressLoading) return;
    if (config.gameMode !== "bot") return;

    // Only snap forward if the saved stage is still locked.
    // Replay of completed / currently unlocked stages must stay selectable.
    if (campaignLevel.campaignNumber > progress.highestUnlocked) {
      updateConfig({ campaignLevelId: highestUnlockedLevelId });
    }
  }, [
    loading,
    progressLoading,
    config.gameMode,
    campaignLevel.campaignNumber,
    progress.highestUnlocked,
    highestUnlockedLevelId,
    updateConfig,
  ]);

  const handleResumeMatch = () => {
    if (!activeSession) return;

    setActiveSession(null);

    router.replace({
      pathname: "/game",
      params: {
        resume: "true",
        levelId: activeSession.levelId,
        gameMode: activeSession.gameMode,
      },
    });
  };

  const handleDeclineResume = async () => {
    setActiveSession(null);
    await clearSessionSnapshot();
  };

  if (loading || progressLoading) {
    return <AppLoadingScreen message="Loading engine..." />;
  }

  return (
    <View style={styles.root}>
      {/* Layer 1: Background Image */}
      <Image
        source={HOME_BACKGROUND}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
        }}
        resizeMode="cover"
      />

      {/* Layer 2 & 3 & UI Content */}
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.container}>

          {/* =========================================================
              TITLE
              Smartphone: EXACTLY the same as before
              iPad: slightly larger
          ========================================================= */}
          <View
            style={[
              styles.titleSection,
              isTablet && styles.titleSectionTablet,
            ]}
          >
            <Image
              source={HOME_TITLE}
              style={[
                styles.titleImage,
                isTablet && styles.titleImageTablet,
              ]}
              resizeMode="contain"
            />
          </View>

          {/* =========================================================
              CHARACTERS
              Smartphone: EXACTLY the same as before
              iPad: slightly larger
          ========================================================= */}
          <View
            style={[
              styles.characterSection,
              isTablet && styles.characterSectionTablet,
            ]}
          >
            <Image
              source={HOME_CHARACTER}
              style={[
                styles.characterImage,
                isTablet && styles.characterImageTablet,
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Play Section */}
          <View style={styles.playSection}>
            <PlayButton
              levelNumber={campaignLevel.campaignNumber}
              subtitle={
                config.gameMode === "pvp"
                  ? `PVP (${campaignLevel.rows}×${campaignLevel.cols})`
                  : `Level ${campaignLevel.campaignNumber}`
              }
              onPress={() =>
                router.replace({
                  pathname: "/game",
                  params: {
                    levelId: config.campaignLevelId,
                    gameMode: config.gameMode,
                  },
                })
              }
            />
          </View>

          {/* Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              {
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.centerActions}>
              <CircleActionButton
                variant="blue"
                onPress={() => router.push("/config")}
              >
                <GearIcon />
              </CircleActionButton>

              <CircleActionButton
                variant="purple"
                onPress={() => router.push("/stats")}
              >
                <StatsIcon />
              </CircleActionButton>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Resume Match Modal */}
      {activeSession && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Resume match?</Text>

              <Text style={styles.modalText}>
                You have an unfinished game on Stage{" "}
                {getCampaignLevel(activeSession.levelId).campaignNumber}.
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resumeBtn,
                    pressed && styles.resumeBtnPressed,
                  ]}
                  onPress={handleResumeMatch}
                >
                  <Text style={styles.resumeBtnText}>
                    YES, RESUME
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.newGameBtn,
                    pressed && styles.newGameBtnPressed,
                  ]}
                  onPress={handleDeclineResume}
                >
                  <Text style={styles.newGameBtnText}>NO</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },

  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* ============================================================
     TITLE — SMARTPHONE DEFAULT
     ============================================================ */

  titleSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
    height: 200,
    paddingHorizontal: 16,
  },

  titleImage: {
    width: "90%",
    maxWidth: 380,
    height: "100%",
  },

  /* ============================================================
     TITLE — iPAD / TABLET
     ============================================================ */

  titleSectionTablet: {
    height: 235,
    paddingHorizontal: 12,
  },

  titleImageTablet: {
    width: "94%",
    maxWidth: 540,
  },

  /* ============================================================
     CHARACTERS — SMARTPHONE DEFAULT
     ============================================================ */

  characterSection: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  characterImage: {
    width: "100%",
    height: "100%",
    maxWidth: 420,
    maxHeight: 460,
  },

  /* ============================================================
     CHARACTERS — iPAD / TABLET
     ============================================================ */

  characterSectionTablet: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },

  characterImageTablet: {
    width: "100%",
    height: "100%",
    maxWidth: 540,
    maxHeight: 540,
  },

  /* ============================================================
     PLAY
     ============================================================ */

  playSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  /* ============================================================
     BOTTOM BAR
     ============================================================ */

  bottomBar: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },

  centerActions: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ============================================================
     MODAL
     ============================================================ */

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: COLORS.border,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 12,
  },

  modalText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 21,
    paddingHorizontal: 4,
  },

  modalActions: {
    width: "100%",
    gap: 10,
  },

  resumeBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: MODAL_UI.goldButtonBg,
    borderWidth: 2,
    borderColor: MODAL_UI.goldButtonBorder,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MODAL_UI.goldButtonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },

  resumeBtnPressed: {
    transform: [{ translateY: 2 }],
    shadowOpacity: 0.15,
  },

  resumeBtnText: {
    color: MODAL_UI.goldButtonText,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  newGameBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  newGameBtnPressed: {
    backgroundColor: COLORS.surfaceStrong,
  },

  newGameBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});