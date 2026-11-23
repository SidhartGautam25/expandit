import React from "react";
import { DimensionValue, StyleSheet, Text, View, Pressable, Modal, Image, useWindowDimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGameSession } from "../hooks/useGameSession";
import { GridBoard } from "../components/grid/GridBoard";
import { ScoreBoard } from "../components/ui/ScoreBoard";
import { ResourceBar } from "../components/ui/ResourceBar";
import { PowerBar } from "../components/ui/PowerBar";
import { LEVEL_REGISTRY } from "../constants/levels";
import {
  COLORS,
  GAME_SCENE,
  PLAYER_CAPTURE_COLORS,
  STAR_UI,
  CROWN_UI,
  MODAL_OUTCOME,
  MODAL_UI,
  getP2VictoryTitleColors,
  palette,
  TYPOGRAPHY,
} from "../constants/theme";
import { APP_NAME } from "../constants/app";
import {
  VISIBLE_CAMPAIGN_LEVELS,
  normalizeCampaignLevelId,
} from "../registries/campaignLevels";
import { parseRouteParam, parseRouteGameMode } from "../utils/routeParams";
import { GameSceneBackground } from "../components/ui/GameSceneBackground";
import { AppLoadingScreen } from "../components/ui/AppLoadingScreen";
import { GameHeaderBar } from "../components/ui/GameHeaderBar";
import { useGameFonts } from "../hooks/useGameFonts";
import { getGameLayoutDensity } from "../utils/gameLayoutDensity";
import { GAME_TYPOGRAPHY } from "../constants/theme";
import { clearSessionSnapshot } from "../services/sessionStorage";
import { TutorialView } from "../tutorial/TutorialView";
import { useCampaignProgress } from "../hooks/useCampaignProgress";
import { useGameConfig } from "../hooks/useGameConfig";

const PLAYFUL_FONT_BOLD = Platform.select({
  ios: "Fredoka_700Bold",
  android: "Fredoka_700Bold",
  web: "'Fredoka', 'Fredoka_700Bold', 'sans-serif-rounded', sans-serif",
  default: "Fredoka_700Bold",
});

const PLAYFUL_FONT_SEMIBOLD = Platform.select({
  ios: "Fredoka_600SemiBold",
  android: "Fredoka_600SemiBold",
  web: "'Fredoka', 'Fredoka_600SemiBold', 'sans-serif-rounded', sans-serif",
  default: "Fredoka_600SemiBold",
});

const VICTORY_MASCOTS = require("../../assets/game/victory-mascots.png");
const DEFEAT_MASCOTS = require("../../assets/game/defeat-mascots.png");

interface ConfettiPiece {
  emoji: string;
  left: DimensionValue;
  top: DimensionValue;
  rotate: string;
}

// Fixed confetti burst — positioned around the top edge of the modal card
const CONFETTI_PIECES: ConfettiPiece[] = [
  { emoji: "🟦", left: "6%", top: "-4%", rotate: "-18deg" },
  { emoji: "🟧", left: "86%", top: "-2%", rotate: "22deg" },
  { emoji: "🟨", left: "18%", top: "-9%", rotate: "12deg" },
  { emoji: "🟪", left: "74%", top: "-11%", rotate: "-28deg" },
  { emoji: "🟩", left: "46%", top: "-7%", rotate: "6deg" },
  { emoji: "🟦", left: "62%", top: "-13%", rotate: "32deg" },
  { emoji: "🟨", left: "32%", top: "-2%", rotate: "-8deg" },
];

function ConfettiBurst() {
  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {CONFETTI_PIECES.map((piece, idx) => (
        <Text
          key={idx}
          style={[
            styles.confettiParticle,
            { left: piece.left, top: piece.top, transform: [{ rotate: piece.rotate }] },
          ]}
        >
          {piece.emoji}
        </Text>
      ))}
    </View>
  );
}

// 3D Cartoon Star component
function ThreeDStar({ active, large }: { active: boolean; large?: boolean }) {
  if (!active) {
    return (
      <View style={[styles.starContainer, large && styles.starContainerLarge]}>
        {/* Dark empty star shadow */}
        <Text style={[styles.starBase, large && styles.starBaseLarge, styles.starBaseInactiveExtrusion]}>★</Text>
        <Text style={[styles.starBase, large && styles.starBaseLarge, styles.starBaseInactiveOutline]}>★</Text>
        <Text style={[styles.starBase, large && styles.starBaseLarge, styles.starBaseInactive]}>★</Text>
      </View>
    );
  }

  return (
    <View style={[styles.starContainer, large && styles.starContainerLarge]}>
      {/* 3D Extrusion Shadow */}
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.shadow, transform: [{ translateY: 4 }, { translateX: 1 }] }]}>★</Text>
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.shadow, transform: [{ translateY: 3 }, { translateX: 1 }] }]}>★</Text>
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.shadow, transform: [{ translateY: 2 }, { translateX: 1 }] }]}>★</Text>
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.outline, transform: [{ translateY: 1 }, { translateX: 0 }, { scale: 1.08 }] }]}>★</Text>
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.active, transform: [{ translateY: 0 }, { translateX: 0 }] }]}>★</Text>
      <Text style={[styles.starBase, large && styles.starBaseLarge, { color: STAR_UI.activeHighlight, transform: [{ translateY: -1 }, { translateX: -1 }, { scale: 0.85 }] }]}>★</Text>
    </View>
  );
}

// 3D Title Component
function ThreeDTitle({
  text,
  color = STAR_UI.active,
  shadowColor = STAR_UI.shadow,
  outlineColor = STAR_UI.outline,
  large,
}: {
  text: string;
  color?: string;
  shadowColor?: string;
  outlineColor?: string;
  large?: boolean;
}) {
  const base = [styles.titleTextBase, large && styles.titleTextBaseLarge];
  return (
    <View style={[styles.titleContainer, large && styles.titleContainerLarge]}>
      {/* Extrusion */}
      <Text style={[...base, { color: shadowColor, transform: [{ translateY: 4 }, { translateX: 1 }] }]}>{text}</Text>
      <Text style={[...base, { color: shadowColor, transform: [{ translateY: 3 }, { translateX: 1 }] }]}>{text}</Text>
      <Text style={[...base, { color: shadowColor, transform: [{ translateY: 2 }, { translateX: 1 }] }]}>{text}</Text>

      {/* Outline */}
      <Text style={[...base, { color: outlineColor, transform: [{ translateY: 1 }, { translateX: 0 }, { scale: 1.05 }] }]}>{text}</Text>

      {/* Main Body */}
      <Text style={[...base, { color: color, transform: [{ translateY: 0 }, { translateX: 0 }] }]}>{text}</Text>

      {/* Shiny Overlay */}
      <Text style={[...base, { color: palette.amber[50], opacity: 0.25, transform: [{ translateY: -1 }, { translateX: -1 }, { scale: 0.95 }] }]}>{text}</Text>
    </View>
  );
}

// 3D Crown Component
function ThreeDCrown() {
  return (
    <View style={styles.crownContainer}>
      {/* Crown Extrusion/Outline */}
      <Text style={[styles.crownEmojiBase, { color: CROWN_UI.outline, transform: [{ translateY: 4 }, { translateX: 1 }] }]}>👑</Text>
      <Text style={[styles.crownEmojiBase, { color: CROWN_UI.outline, transform: [{ translateY: 3 }, { translateX: 1 }] }]}>👑</Text>
      {/* Main Crown */}
      <Text style={styles.crownEmojiBase}>👑</Text>
    </View>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    resume?: string;
    levelId?: string;
    level?: string;
    gameMode?: string;
  }>();
  const { completeCampaignLevel } = useCampaignProgress();
  const { updateConfig } = useGameConfig();

  const isResume = params.resume === "true" || parseRouteParam(params.resume) === "true";
  const startupLevelIdRaw = parseRouteParam(params.levelId) ?? parseRouteParam(params.level);
  const startupLevelId = startupLevelIdRaw
    ? normalizeCampaignLevelId(startupLevelIdRaw)
    : undefined;
  const startupGameMode = parseRouteGameMode(params.gameMode);
  const fontsLoaded = useGameFonts();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const {
    board,
    activePlayer,
    scores,
    winner,
    isBotThinking,
    timer,
    handleTileTap,
    handleTileLongPress,
    resetGame,
    handleUndo,
    canUndo,
    config,
    gameMode,
    turn,
    lastBotMoves,
    players,
    selectedPower,
    targetingMode,
    powerMessage,
    activatePower,
    cancelPowerTargeting,
    level,
    totalBoxes,
    configLoading,
    loadLevel,
    player1ColorHex,
    player2ColorHex,
  } = useGameSession({ isResume, startupLevelId, startupGameMode });

  const [showWinnerModal, setShowWinnerModal] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [boardAreaHeight, setBoardAreaHeight] = React.useState(0);

  React.useEffect(() => {
    if (winner !== null) {
      setShowWinnerModal(true);
    } else {
      setShowWinnerModal(false);
    }
  }, [winner]);

  if (configLoading || !board || !fontsLoaded) {
    return <AppLoadingScreen message={`Loading ${level.name}...`} />;
  }

  if (level.campaignNumber === 0) {
    return (
      <TutorialView
        onComplete={async () => {
          await completeCampaignLevel("campaign-0");
          await updateConfig({ campaignLevelId: "campaign-1" });
          loadLevel("campaign-1");
          router.replace({
            pathname: "/game",
            params: { levelId: "campaign-1", gameMode: "bot" },
          });
        }}
        onLeave={async () => {
          await clearSessionSnapshot();
          router.replace("/");
        }}
      />
    );
  }

  const activePlayerState = activePlayer === 1 ? players.player1 : players.player2;
  const isInteractionDisabled =
    activePlayer === 2 && gameMode === "bot" && isBotThinking;
  const layoutDensity = getGameLayoutDensity(screenHeight, level.rows, level.cols);
  const isCompactLayout = layoutDensity !== "normal";
  const isTightLayout = layoutDensity === "tight";

  const excludedBoxId =
    turn.tapsRemaining < turn.tapsPerTurn ? turn.firstTapBoxId : null;

  const renderEndGameModal = () => {
    if (winner === null) return null;

    const isBotMode = gameMode === "bot";
    const currentCampaignNumber = level.campaignNumber;
    const hasNextLevel =
      isBotMode &&
      currentCampaignNumber > 0 &&
      currentCampaignNumber < VISIBLE_CAMPAIGN_LEVELS.length;

    let modalTitle = "";
    let modalSubtitle = "";
    let buttonText = "NEXT LEVEL";
    let onButtonPress = () => { };

    let bannerText = "";
    let isVictory = false;

    let bannerBg: string = MODAL_OUTCOME.draw.bannerBg;
    let bannerBorder: string = MODAL_OUTCOME.draw.bannerBorder;
    let modalColor: string = MODAL_OUTCOME.draw.accent;
    let titleColor: string = MODAL_OUTCOME.draw.titleColor ?? MODAL_OUTCOME.draw.accent;
    let titleShadow: string = MODAL_OUTCOME.draw.titleShadow ?? MODAL_OUTCOME.draw.accent;
    let titleOutline: string = MODAL_OUTCOME.draw.titleOutline ?? MODAL_OUTCOME.draw.accent;

    const p1Percent = totalBoxes > 0 ? Math.round((scores.player1 / totalBoxes) * 100) : 0;
    const p2Percent = totalBoxes > 0 ? Math.round((scores.player2 / totalBoxes) * 100) : 0;

    if (winner === 1) {
      if (isBotMode) {
        const o = MODAL_OUTCOME.botVictory;
        modalTitle = "VICTORY!";
        bannerText = "YOU CRUSHED IT!";
        bannerBg = o.bannerBg;
        bannerBorder = o.bannerBorder;
        modalColor = o.accent;
        titleColor = o.titleColor;
        titleShadow = o.titleShadow;
        titleOutline = o.titleOutline;
        isVictory = true;

        if (currentCampaignNumber > 0) {
          modalSubtitle = `You successfully completed Stage ${currentCampaignNumber}: ${level.name}!`;
          if (hasNextLevel) {
            buttonText = "NEXT LEVEL  ❯";
            onButtonPress = () => {
              setShowWinnerModal(false);
              const nextLevelId = `campaign-${currentCampaignNumber + 1}`;
              router.setParams({ levelId: nextLevelId, level: nextLevelId });
              loadLevel(nextLevelId);
            };
          } else {
            modalSubtitle = `Incredible job! You have conquered the entire ${APP_NAME} campaign!`;
            buttonText = "RETURN TO HOME  ❯";
            onButtonPress = () => {
              setShowWinnerModal(false);
              router.replace("/");
            };
          }
        } else {
          modalSubtitle = "You won the match!";
          buttonText = "PLAY AGAIN  ❯";
          onButtonPress = () => {
            setShowWinnerModal(false);
            resetGame();
          };
        }
      } else {
        const o = MODAL_OUTCOME.p1Victory;
        modalTitle = "VICTORY!";
        bannerText = "PLAYER 1 WINS!";
        bannerBg = o.bannerBg;
        bannerBorder = o.bannerBorder;
        modalColor = o.accent;
        titleColor = o.titleColor;
        titleShadow = o.titleShadow;
        titleOutline = o.titleOutline;
        modalSubtitle = `Player 1 claimed victory with ${scores.player1} claimed boxes!`;
        buttonText = "PLAY AGAIN  ❯";
        onButtonPress = () => {
          setShowWinnerModal(false);
          resetGame();
        };
      }
    } else if (winner === 2) {
      if (isBotMode) {
        const o = MODAL_OUTCOME.botDefeat;
        modalTitle = "DEFEAT";
        bannerText = "THE BOT WON!";
        bannerBg = o.bannerBg;
        bannerBorder = o.bannerBorder;
        modalColor = o.accent;
        titleColor = o.titleColor;
        titleShadow = o.titleShadow;
        titleOutline = o.titleOutline;
        modalSubtitle = "The bot outsmarted you this time. Keep trying to claim the next stage!";
        buttonText = "RETRY LEVEL  ❯";
        onButtonPress = () => {
          setShowWinnerModal(false);
          resetGame();
        };
      } else {
        const o = MODAL_OUTCOME.p2Victory;
        const p2Title = getP2VictoryTitleColors(player2ColorHex);
        modalTitle = "VICTORY!";
        bannerText = "PLAYER 2 WINS!";
        bannerBg = o.bannerBg;
        bannerBorder = o.bannerBorder;
        modalColor = player2ColorHex;
        titleColor = p2Title.titleColor;
        titleShadow = p2Title.titleShadow;
        titleOutline = p2Title.titleOutline;
        modalSubtitle = `Player 2 claimed victory with ${scores.player2} claimed boxes!`;
        buttonText = "PLAY AGAIN  ❯";
        onButtonPress = () => {
          setShowWinnerModal(false);
          resetGame();
        };
      }
    } else {
      const o = MODAL_OUTCOME.draw;
      modalTitle = "DRAW";
      bannerText = "EQUAL TERRITORY!";
      bannerBg = o.bannerBg;
      bannerBorder = o.bannerBorder;
      modalColor = o.accent;
      titleColor = o.titleColor ?? o.accent;
      titleShadow = o.titleShadow ?? o.accent;
      titleOutline = o.titleOutline ?? o.accent;
      modalSubtitle = "It's a complete tie! You both claimed equal territory.";
      buttonText = "PLAY AGAIN  ❯";
      onButtonPress = () => {
        setShowWinnerModal(false);
        resetGame();
      };
    }

    let numStars = 0;
    let starMessage = "";
    if (isVictory) {
      if (p1Percent > 85) {
        numStars = 3;
        starMessage = "PERFECT VICTORY! YOU CRUSHED IT!";
      } else if (p1Percent > 65) {
        numStars = 2;
        starMessage = "GREAT JOB! SOLID STRATEGY!";
      } else {
        numStars = 1;
        starMessage = "STAGE CLEARED! WELL PLAYED!";
      }
    }

    const showMascots = winner === 1 || winner === 2; // skip mascots on a draw
    const mascotSource = isVictory ? VICTORY_MASCOTS : DEFEAT_MASCOTS;

    return (
      <Modal
        visible={showWinnerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWinnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: modalColor }, isTablet && styles.modalContentTablet]}>
            {isVictory && <ConfettiBurst />}

            {showMascots && (
              <Image
                source={mascotSource}
                style={[styles.modalMascots, isTablet && styles.modalMascotsTablet]}
                resizeMode="contain"
              />
            )}

            <ThreeDTitle
              text={modalTitle}
              color={titleColor}
              shadowColor={titleShadow}
              outlineColor={titleOutline}
              large={isTablet}
            />

            <View style={styles.modalSubtitleBannerWrap}>
              <View style={styles.modalRibbonTriangleLeft} />
              <View style={[styles.modalSubtitleBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
                <Text style={styles.modalSubtitleBannerText}>{bannerText}</Text>
              </View>
              <View style={styles.modalRibbonTriangleRight} />
            </View>

            <View style={styles.modalCardsRow}>
              <View style={[styles.modalCard, styles.modalCardP1]}>
                <Text style={[styles.modalCardLabel, { color: TYPOGRAPHY.color.player1Soft }]}>
                  {isBotMode ? "YOU (P1)" : "PLAYER 1"}
                </Text>
                <Text style={styles.modalCardVal}>{scores.player1}</Text>
                <Text style={[styles.modalCardPercent, { color: TYPOGRAPHY.color.player1Soft }]}>{p1Percent}% claimed</Text>
              </View>

              <View style={styles.vsOuter}>
                <View style={styles.vsStarburst}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
              </View>

              <View style={[styles.modalCard, styles.modalCardP2]}>
                <Text style={[styles.modalCardLabel, { color: TYPOGRAPHY.color.player2 }]}>
                  {isBotMode ? "BOT (P2)" : "PLAYER 2"}
                </Text>
                <Text style={styles.modalCardVal}>{scores.player2}</Text>
                <Text style={[styles.modalCardPercent, { color: TYPOGRAPHY.color.player2 }]}>{p2Percent}% claimed</Text>
              </View>
            </View>

            {currentCampaignNumber > 0 && isBotMode && (
              <View style={styles.modalStagePill}>
                <Text style={styles.modalLevelName}>
                  ✦ STAGE {currentCampaignNumber}: {level.name.toUpperCase()} ✦
                </Text>
              </View>
            )}

            {isVictory && (
              <View style={styles.modalStarsSection}>
                <View style={styles.modalStarsRow}>
                  {[1, 2, 3].map((starIdx) => {
                    const active = starIdx <= numStars;
                    return (
                      <ThreeDStar key={starIdx} active={active} large={isTablet} />
                    );
                  })}
                </View>
                <Text style={styles.modalStarMsg}>{starMessage}</Text>
              </View>
            )}

            {!isVictory && (
              <Text style={styles.modalSubtitleText}>
                {modalSubtitle}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.modalPrimaryBtn,
                  isVictory
                    ? styles.modalPrimaryBtnGold
                    : (winner === 2 && isBotMode)
                      ? styles.modalPrimaryBtnRed
                      : { backgroundColor: modalColor }
                ]}
                onPress={onButtonPress}
              >
                <Text style={[
                  styles.modalPrimaryBtnText,
                  isVictory && styles.modalPrimaryBtnGoldText,
                  (!isVictory && winner === 2 && isBotMode) && styles.modalPrimaryBtnRedText
                ]}>
                  {buttonText}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setShowWinnerModal(false);
                  router.replace("/");
                }}
              >
                <Text style={styles.modalSecondaryBtnText}>RETURN TO MENU</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderLeaveModal = () => {
    if (!showLeaveModal) return null;

    return (
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.leaveModalContent}>
            <Text style={styles.leaveModalTitle}>Resume match?</Text>
            <Text style={styles.leaveModalText}>
              {level.campaignNumber > 0
                ? `You have an active match on Stage ${level.campaignNumber}: ${level.name}.`
                : "You have an active match in progress."}
            </Text>

            <View style={styles.leaveModalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.resumeBtn,
                  pressed && styles.resumeBtnPressed,
                ]}
                onPress={() => setShowLeaveModal(false)}
              >
                <Text style={styles.resumeBtnText}>YES, RESUME</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.leaveNoBtn,
                  pressed && styles.leaveNoBtnPressed,
                ]}
                onPress={async () => {
                  setShowLeaveModal(false);
                  await clearSessionSnapshot();
                  router.replace("/");
                }}
              >
                <Text style={styles.leaveNoBtnText}>NO</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <GameSceneBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.chromeSection}>
          <View
            style={[
              styles.topHeaderPanel,
              isCompactLayout && styles.topHeaderPanelCompact,
              isTightLayout && styles.topHeaderPanelTight,
            ]}
          >
            <GameHeaderBar
              levelNumber={level.campaignNumber}
              stageName={level.name}
              density={layoutDensity}
              gameMode={gameMode}
              dimensions={{ rows: level.rows, cols: level.cols }}
              botLabel={
                gameMode === "bot"
                  ? LEVEL_REGISTRY[level.botDifficulty]?.name ?? "Bot"
                  : undefined
              }
            />
          </View>

          <ScoreBoard
            player1Score={scores.player1}
            player2Score={scores.player2}
            activePlayer={activePlayer}
            isBotThinking={isBotThinking}
            winner={winner}
            gameMode={gameMode}
            tapsRemaining={turn.tapsRemaining}
            tapsPerTurn={turn.tapsPerTurn}
            totalBoxes={totalBoxes}
            powerMessage={powerMessage}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
            density={layoutDensity}
          />

          <ResourceBar
            resources={activePlayerState.resources}
            alwaysShow={level.showResources}
          />

          <PowerBar
            powers={activePlayerState.powers}
            selectedPower={selectedPower}
            targetingMode={targetingMode}
            onActivatePower={activatePower}
            onCancelTargeting={cancelPowerTargeting}
            disabled={isInteractionDisabled}
            alwaysShowHint={level.showPowers}
          />
        </View>

        <View
          style={styles.boardContainer}
          onLayout={(event) => {
            setBoardAreaHeight(event.nativeEvent.layout.height);
          }}
        >
          <GridBoard
            board={board}
            onTileTap={handleTileTap}
            onTileLongPress={handleTileLongPress}
            disabled={isInteractionDisabled && !targetingMode}
            lastBotMoves={lastBotMoves}
            activePlayer={activePlayer}
            turn={turn}
            targetingMode={targetingMode}
            excludedBoxId={excludedBoxId}
            gameMode={gameMode}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
            availableHeight={boardAreaHeight}
            layoutDensity={layoutDensity}
          />
        </View>

        <View
          style={[
            styles.bottomControlsContainer,
            isCompactLayout && styles.bottomControlsContainerCompact,
            isTightLayout && styles.bottomControlsContainerTight,
          ]}
        >
          <Pressable
            style={[
              styles.undoBtn,
              isCompactLayout && styles.undoBtnCompact,
              isTightLayout && styles.undoBtnTight,
              !canUndo && styles.btnDisabled,
            ]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Text style={[styles.undoBtnText, !canUndo && styles.textDisabled]}>
              ↩ UNDO LAST STEP
            </Text>
          </Pressable>

          <View
            style={[
              styles.bottomRow,
              isCompactLayout && styles.bottomRowCompact,
              isTightLayout && styles.bottomRowTight,
            ]}
          >
            <Pressable
              style={[
                styles.largeLeaveBtn,
                isCompactLayout && styles.largeBtnCompact,
                isTightLayout && styles.largeBtnTight,
              ]}
              onPress={() => setShowLeaveModal(true)}
            >
              <Text style={[styles.largeLeaveText, isTightLayout && styles.bottomBtnTextTight]}>
                LEAVE
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.largeResetBtn,
                isCompactLayout && styles.largeBtnCompact,
                isTightLayout && styles.largeBtnTight,
              ]}
              onPress={resetGame}
            >
              <Text style={[styles.largeResetText, isTightLayout && styles.bottomBtnTextTight]}>
                RESET
              </Text>
            </Pressable>
          </View>
        </View>
        {renderEndGameModal()}
        {renderLeaveModal()}
      </SafeAreaView>
    </GameSceneBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chromeSection: {
    flexShrink: 0,
  },
  topHeaderPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  topHeaderPanelCompact: {
    paddingTop: 4,
    paddingBottom: 0,
    paddingHorizontal: 12,
  },
  topHeaderPanelTight: {
    paddingTop: 2,
    paddingBottom: 0,
    paddingHorizontal: 10,
  },
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 0,
    flexShrink: 1,
  },
  bottomControlsContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
    flexShrink: 0,
  },
  bottomControlsContainerCompact: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  bottomControlsContainerTight: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 5,
  },
  undoBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: GAME_SCENE.controls.bg,
    borderWidth: 1.5,
    borderColor: GAME_SCENE.controls.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: GAME_SCENE.panel.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  undoBtnCompact: {
    height: 42,
    borderRadius: 14,
  },
  undoBtnTight: {
    height: 34,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  undoBtnText: {
    ...GAME_TYPOGRAPHY.button,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
  },
  bottomRowCompact: {
    gap: 8,
  },
  bottomRowTight: {
    gap: 6,
  },
  largeLeaveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: GAME_SCENE.controls.bg,
    borderWidth: 1.5,
    borderColor: GAME_SCENE.controls.border,
    justifyContent: "center",
    alignItems: "center",
  },
  largeBtnCompact: {
    height: 42,
    borderRadius: 14,
  },
  largeBtnTight: {
    height: 34,
    borderRadius: 12,
  },
  bottomBtnTextTight: {
    fontSize: 12,
  },
  largeLeaveText: {
    ...GAME_TYPOGRAPHY.button,
    color: GAME_SCENE.controls.text,
  },
  largeResetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: GAME_SCENE.controls.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: GAME_SCENE.panels.banner.border,
    shadowColor: GAME_SCENE.panel.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  largeResetText: {
    ...GAME_TYPOGRAPHY.button,
    color: GAME_SCENE.controls.primaryText,
  },
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
    borderWidth: 4,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: "visible",
  },
  modalContentTablet: {
    maxWidth: 460,
    padding: 32,
  },
  modalMascots: {
    width: "90%",
    height: 135,
    marginTop: -88,
    marginBottom: 6,
    zIndex: 10,
  },
  modalMascotsTablet: {
    height: 180,
    marginTop: -115,
    marginBottom: 10,
    zIndex: 10,
  },
  modalTitleText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: "uppercase",
  },
  modalSubtitleText: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  modalStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalStatCol: {
    alignItems: "center",
    minWidth: 70,
  },
  modalStatLabel: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalStatVal: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalStatVs: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    opacity: 0.5,
  },
  modalActions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  modalPrimaryBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  modalPrimaryBtnText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalSecondaryBtn: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSecondaryBtnText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  crownWrapper: {
    position: "absolute",
    top: -46,
    alignSelf: "center",
    zIndex: 99,
  },
  crownEmoji: {
    fontSize: 54,
    textShadowColor: COLORS.shadowStrong,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    overflow: "visible",
    zIndex: 1,
  },
  confettiParticle: {
    position: "absolute",
    fontSize: 18,
  },
  modalSubtitleBannerWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalRibbonTriangleLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: COLORS.shadowStrong,
    opacity: 0.45,
  },
  modalRibbonTriangleRight: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: COLORS.shadowStrong,
    opacity: 0.45,
  },
  modalSubtitleBanner: {
    borderRadius: 20,
    borderWidth: 2.5,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  modalSubtitleBannerText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  modalCardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  modalCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 3,
  },
  modalCardP1: {
    borderColor: COLORS.player1Dark,
    backgroundColor: COLORS.player1BgMedium,
  },
  modalCardP2: {
    borderColor: COLORS.player2Dark,
    backgroundColor: COLORS.player2BgSoft,
  },
  modalCardLabel: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalCardVal: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 34,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalCardPercent: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  modalVsFlash: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 14,
    fontWeight: "700",
    color: MODAL_UI.starActive,
    textShadowColor: COLORS.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalStagePill: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignSelf: "center",
  },
  modalLevelName: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  modalStarsSection: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 16,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 20,
  },
  modalStarsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  modalStar: {
    fontSize: 36,
    textShadowColor: COLORS.textShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  modalStarActive: {
    color: MODAL_UI.starActive,
  },
  modalStarInactive: {
    color: MODAL_UI.starInactive,
  },
  modalStarMsg: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 4,
  },
  modalPrimaryBtnGold: {
    backgroundColor: MODAL_UI.goldButtonBg,
    borderWidth: 2.5,
    borderColor: MODAL_UI.goldButtonBorder,
    shadowColor: MODAL_UI.goldButtonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  modalPrimaryBtnGoldText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: MODAL_UI.goldButtonText,
    fontWeight: "700",
    fontSize: 15,
  },
  modalPrimaryBtnRed: {
    backgroundColor: "#FF334B",
    borderWidth: 2.5,
    borderColor: "#B91C1C",
    shadowColor: "#800918",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 4,
  },
  modalPrimaryBtnRedText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  titleContainer: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  titleContainerLarge: {
    height: 80,
    marginBottom: 14,
  },
  titleTextBase: {
    position: "absolute",
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    left: 0,
    right: 0,
  },
  titleTextBaseLarge: {
    fontSize: 54,
  },
  starContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  starContainerLarge: {
    width: 64,
    height: 64,
  },
  starBase: {
    position: "absolute",
    fontSize: 48,
    textAlign: "center",
  },
  starBaseLarge: {
    fontSize: 60,
  },
  starBaseInactive: {
    color: STAR_UI.inactive,
  },
  starBaseInactiveExtrusion: {
    color: STAR_UI.inactiveShadow,
    transform: [{ translateY: 3 }, { translateX: 1 }],
  },
  starBaseInactiveOutline: {
    color: STAR_UI.inactiveOutline,
    transform: [{ translateY: 1 }, { translateX: 0 }, { scale: 1.08 }],
  },
  crownContainer: {
    position: "absolute",
    top: -50,
    alignSelf: "center",
    zIndex: 99,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  crownEmojiBase: {
    position: "absolute",
    fontSize: 54,
    textAlign: "center",
  },
  vsOuter: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  vsStarburst: {
    width: 38,
    height: 38,
    backgroundColor: MODAL_UI.vsBadgeBg,
    borderColor: MODAL_UI.vsBadgeBorder,
    borderWidth: 2.5,
    borderRadius: 8,
    transform: [{ rotate: "45deg" }],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  vsText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 14,
    fontWeight: "700",
    color: MODAL_UI.vsBadgeText,
    transform: [{ rotate: "-45deg" }],
    letterSpacing: 0.5,
  },
  leaveModalContent: {
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
  leaveModalTitle: {
    fontFamily: PLAYFUL_FONT_BOLD,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 12,
  },
  leaveModalText: {
    fontFamily: PLAYFUL_FONT_SEMIBOLD,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  leaveModalActions: {
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
    fontFamily: PLAYFUL_FONT_BOLD,
    color: MODAL_UI.goldButtonText,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  leaveNoBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  leaveNoBtnPressed: {
    backgroundColor: COLORS.surfaceStrong,
  },
  leaveNoBtnText: {
    fontFamily: PLAYFUL_FONT_BOLD,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
});