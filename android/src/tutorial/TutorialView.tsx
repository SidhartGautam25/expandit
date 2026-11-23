import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameSceneBackground } from "../components/ui/GameSceneBackground";
import { GameHeaderBar } from "../components/ui/GameHeaderBar";
import { CliboGuide } from "./CliboGuide";
import { TutorialBoard } from "./TutorialBoard";
import { useTutorialEngine } from "./useTutorialEngine";

interface TutorialViewProps {
  onComplete: () => void;
  onLeave: () => void;
}

export function TutorialView({ onComplete, onLeave }: TutorialViewProps) {
  const [boardAreaHeight, setBoardAreaHeight] = useState(0);

  const engine = useTutorialEngine(onComplete);

  const handleTileTap = (r: number, c: number) => {
    if (engine.canPerformAction(r, c, "tap")) {
      engine.handleActionSuccess(r, c, "tap");
    }
  };

  const handleTileLongPress = (r: number, c: number) => {
    if (engine.canPerformAction(r, c, "freeze")) {
      engine.handleActionSuccess(r, c, "freeze");
    }
  };

  return (
    <GameSceneBackground>
      <SafeAreaView style={styles.safeArea}>
        <GameHeaderBar
          levelNumber={0}
          stageName="CLIBO'S TRAINING"
        />

        <View style={styles.content}>
          <CliboGuide
            stepNumber={engine.currentStepIndex + 1}
            totalSteps={engine.totalSteps}
            title={engine.currentStep.title}
            message={engine.currentStep.message}
            expression={engine.currentStep.expression}
            turnLabel={engine.currentStep.turnLabel}
            canGoPrev={engine.canGoPrev}
            canGoNext={engine.canGoNext}
            onPrev={engine.prevStep}
            showNextButton={
              engine.currentStep.actionType === "read" || engine.isTutorialComplete
            }
            nextButtonText={
              engine.currentStep.buttonText ??
              (engine.currentStepIndex >= engine.totalSteps - 1 ? "START STAGE 1 ▶" : "NEXT ▶")
            }
            onNext={() => {
              if (engine.currentStepIndex >= engine.totalSteps - 1) {
                onComplete();
              } else {
                engine.advanceStep();
              }
            }}
            onSkipTutorial={onComplete}
          />

          <View
            style={styles.boardContainer}
            onLayout={(e) => setBoardAreaHeight(e.nativeEvent.layout.height)}
          >
            <TutorialBoard
              board={engine.board}
              targetCoord={engine.targetCoord}
              onTileTap={handleTileTap}
              onTileLongPress={handleTileLongPress}
              availableHeight={boardAreaHeight}
            />
          </View>
        </View>
      </SafeAreaView>
    </GameSceneBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
});
