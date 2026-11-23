import React, { useMemo } from "react";
import { StyleSheet, View, Pressable, useWindowDimensions } from "react-native";
import { GameBoard } from "../types/board";
import { Coord } from "../types/box";
import {
  getBoardMetrics,
  getBoardContentSize,
  getCellFillLayout,
} from "../engine/board/boardLayout";
import { GAME_SCENE, COLORS } from "../constants/theme";
import { TutorialBoxShapeLayer } from "./TutorialBoxShapeLayer";

const INNER_BORDER = 8;

interface TutorialBoardProps {
  board: GameBoard;
  targetCoord: Coord;
  onTileTap: (row: number, col: number) => void;
  onTileLongPress: (row: number, col: number) => void;
  availableHeight?: number;
}

export function TutorialBoard({
  board,
  targetCoord,
  onTileTap,
  onTileLongPress,
  availableHeight,
}: TutorialBoardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const maxBoardWidth = Math.min(screenWidth - 24, 450);
  const gridGap = 4;
  const boardPadding = 8;
  const maxBoardHeight = availableHeight && availableHeight > 80 ? availableHeight - 6 : 300;

  const { metrics, contentWidth, contentHeight } = useMemo(() => {
    const innerMaxWidth = Math.max(40, maxBoardWidth - INNER_BORDER * 2);
    const innerMaxHeight = Math.max(40, maxBoardHeight - INNER_BORDER * 2);

    const m = getBoardMetrics(
      innerMaxWidth,
      board.cols,
      board.rows,
      boardPadding,
      gridGap
    );
    const size = getBoardContentSize(m, board.cols, board.rows);
    return {
      metrics: m,
      contentWidth: size.width,
      contentHeight: size.height,
    };
  }, [board, maxBoardWidth, maxBoardHeight]);

  const boardWidth = contentWidth + INNER_BORDER * 2;
  const boardHeight = contentHeight + INNER_BORDER * 2;

  const boxes = useMemo(() => Object.values(board.boxes), [board.boxes]);

  return (
    <View style={[styles.boardFrame, { padding: 2 }]}>
      <View
        style={[
          styles.container,
          { width: boardWidth, height: boardHeight },
        ]}
      >
        <View
          style={[
            styles.contentLayer,
            { width: contentWidth, height: contentHeight },
          ]}
        >
          <TutorialBoxShapeLayer
            board={board}
            metrics={metrics}
            lastBotBoxIds={new Set()}
            targetCoord={targetCoord}
            player1ColorHex={COLORS.player1}
            player2ColorHex={COLORS.player2}
          />

          {boxes.flatMap((box) => {
            return box.cells.map((cell) => {
              const isTargetCell =
                cell.row === targetCoord.row && cell.col === targetCoord.col;

              const layout = getCellFillLayout(board, box, cell, metrics);

              return (
                <Pressable
                  key={`tap-${box.id}-${cell.row}-${cell.col}`}
                  style={[
                    styles.tapCell,
                    {
                      left: layout.left,
                      top: layout.top,
                      width: layout.width,
                      height: layout.height,
                      zIndex: isTargetCell ? 100 : 10,
                    },
                  ]}
                  delayLongPress={300}
                  onPress={() => onTileTap(cell.row, cell.col)}
                  onLongPress={() => onTileLongPress(cell.row, cell.col)}
                />
              );
            });
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderRadius: 20,
    backgroundColor: GAME_SCENE.board.frameDark,
    shadowColor: GAME_SCENE.board.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: "center",
  },
  container: {
    backgroundColor: GAME_SCENE.board.bg,
    borderRadius: 18,
    borderWidth: INNER_BORDER,
    borderColor: GAME_SCENE.board.frame,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  contentLayer: {
    position: "relative",
  },
  tapCell: {
    position: "absolute",
  },
});
