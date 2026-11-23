import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { COLORS } from "../constants/theme";
import { CliboMascot, CliboExpression } from "./CliboMascot";

export interface CliboGuideProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  message: string;
  expression?: CliboExpression;
  turnLabel?: string;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSkipTutorial?: () => void;
  showNextButton?: boolean;
  nextButtonText?: string;
}

export function CliboGuide({
  stepNumber,
  totalSteps,
  title,
  message,
  expression = "explaining",
  turnLabel,
  canGoPrev = false,
  canGoNext = true,
  onPrev,
  onNext,
  onSkipTutorial,
  showNextButton = false,
  nextButtonText = "GOT IT! ▶",
}: CliboGuideProps) {
  const isBotTurn = turnLabel?.includes("BOT");

  return (
    <View style={styles.container}>
      {/* 3D Clibo Mascot */}
      <CliboMascot expression={expression} size={76} />

      {/* Speech Bubble */}
      <View style={styles.speechBubble}>
        <View style={styles.bubbleHeader}>
          <View style={styles.headerBadges}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                STEP {stepNumber}/{totalSteps}
              </Text>
            </View>

            {turnLabel && (
              <View
                style={[
                  styles.turnBadge,
                  isBotTurn ? styles.botTurnBadge : styles.userTurnBadge,
                ]}
              >
                <Text
                  style={[
                    styles.turnBadgeText,
                    isBotTurn ? styles.botTurnText : styles.userTurnText,
                  ]}
                >
                  {turnLabel}
                </Text>
              </View>
            )}
          </View>

          {onSkipTutorial && (
            <Pressable onPress={onSkipTutorial} style={styles.skipTutorialBtn}>
              <Text style={styles.skipTutorialBtnText}>SKIP TUTORIAL ✕</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.messageText}>{message}</Text>

        {/* Footer Navigation Controls */}
        <View style={styles.navigationRow}>
          {canGoPrev && onPrev ? (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.prevBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onPrev}
            >
              <Text style={styles.prevBtnText}>◀ PREV</Text>
            </Pressable>
          ) : (
            <View />
          )}

          {showNextButton && onNext && (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.nextBtn,
                isBotTurn && styles.botNextBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onNext}
            >
              <Text style={styles.nextBtnText}>{nextButtonText}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    zIndex: 100,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: "rgba(255, 251, 245, 0.96)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: COLORS.shadowStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  stepBadge: {
    backgroundColor: COLORS.accentGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.8,
  },
  turnBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  userTurnBadge: {
    backgroundColor: "rgba(79, 142, 247, 0.18)",
    borderWidth: 1,
    borderColor: COLORS.player1,
  },
  botTurnBadge: {
    backgroundColor: "rgba(255, 82, 82, 0.18)",
    borderWidth: 1,
    borderColor: COLORS.player2,
  },
  turnBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  userTurnText: {
    color: COLORS.player1,
  },
  botTurnText: {
    color: COLORS.player2,
  },
  skipTutorialBtn: {
    backgroundColor: "rgba(255, 82, 82, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.3)",
  },
  skipTutorialBtnText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#E53935",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  navigationRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  prevBtn: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
  },
  prevBtnText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  nextBtn: {
    backgroundColor: COLORS.player1,
  },
  botNextBtn: {
    backgroundColor: COLORS.player2,
  },
  btnPressed: {
    opacity: 0.8,
  },
  nextBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
});
