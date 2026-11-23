import React, { useMemo } from "react";
import { StyleSheet, View, Pressable, useWindowDimensions } from "react-native";
import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { Coord } from "../../types/box";
import { TurnState } from "../../types/session";
import {
  fitBoardLayout,
  getBoardContentSize,
  getBoardMetrics,
  getCellFillLayout,
} from "../../engine/board/boardLayout";
import { createMoveContext, getValidMoves, canFreezeBox, canInitiateFreezeTurn } from "../../engine/gameEngine";
import { BoxShapeLayer } from "./BoxShapeLayer";
import { GAME_SCENE } from "../../constants/theme";
import type { GameLayoutDensity } from "../../utils/gameLayoutDensity";
import { getLastMoveBoxIds } from "../../utils/lastMove";

const INNER_BORDER = 1;

interface GridBoardProps {
  board: GameBoard;
  onTileTap: (row: number, col: number) => void;
  onTileLongPress: (row: number, col: number) => void;
  disabled: boolean;
  lastBotMoves: Coord[];
  activePlayer: Player;
  turn: TurnState;
  targetingMode?: boolean;
  excludedBoxId?: string | null;
  gameMode?: "bot" | "pvp";
  player1ColorHex?: string;
  player2ColorHex?: string;
  /** Measured height of the flex board area from the game screen */
  availableHeight?: number;
  layoutDensity?: GameLayoutDensity;
}

export function GridBoard({
  board,
  onTileTap,
  onTileLongPress,
  disabled,
  lastBotMoves,
  activePlayer,
  turn,
  targetingMode = false,
  excludedBoxId = null,
  gameMode = "bot",
  player1ColorHex,
  player2ColorHex,
  availableHeight,
  layoutDensity = "normal",
}: GridBoardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTallBoard = board.rows > board.cols;
  const isTight = layoutDensity === "tight";
  const framePadding = isTight ? 1 : 2;
  const maxBoardWidth = Math.min(screenWidth - (isTight ? 16 : 24), 450);
  const gridGap = isTallBoard ? (isTight ? 2 : 3) : isTight ? 4 : 5;
  const boardPadding = isTight ? 6 : 8;
  const fallbackBoardHeight = Math.max(180, screenHeight - (isTight ? 220 : 310));
  const heightSlack = isTight ? 2 : 6;
  const maxBoardHeight =
    availableHeight && availableHeight > 80
      ? availableHeight - heightSlack
      : fallbackBoardHeight;

  const { metrics, contentWidth, contentHeight } = useMemo(() => {
    const innerMaxWidth = Math.max(40, maxBoardWidth - INNER_BORDER * 2);
    const innerMaxHeight = Math.max(40, maxBoardHeight - INNER_BORDER * 2);

    const widthMetrics = getBoardMetrics(
      innerMaxWidth,
      board.cols,
      board.rows,
      boardPadding,
      gridGap
    );
    const widthSize = getBoardContentSize(widthMetrics, board.cols, board.rows);
    const widthBasedFits =
      widthSize.width <= innerMaxWidth && widthSize.height <= innerMaxHeight;

    if (isTallBoard && widthBasedFits) {
      return {
        metrics: widthMetrics,
        contentWidth: widthSize.width,
        contentHeight: widthSize.height,
      };
    }

    if (
      !isTallBoard &&
      widthSize.width <= innerMaxWidth &&
      widthSize.height <= innerMaxHeight
    ) {
      const square = Math.min(innerMaxWidth, innerMaxHeight);
      const squareMetrics = getBoardMetrics(
        square,
        board.cols,
        board.rows,
        boardPadding,
        gridGap
      );
      const squareSize = getBoardContentSize(squareMetrics, board.cols, board.rows);
      return {
        metrics: squareMetrics,
        contentWidth: squareSize.width,
        contentHeight: squareSize.height,
      };
    }

    const fitted = fitBoardLayout(innerMaxWidth, innerMaxHeight, board.cols, board.rows, {
      gap: gridGap,
      padding: boardPadding,
      preferWidthCellSize: isTallBoard,
    });
    return {
      metrics: fitted.metrics,
      contentWidth: fitted.width,
      contentHeight: fitted.height,
    };
  }, [
    isTallBoard,
    maxBoardHeight,
    maxBoardWidth,
    board.cols,
    board.rows,
    gridGap,
    boardPadding,
  ]);

  const boardWidth = contentWidth + INNER_BORDER * 2;
  const boardHeight = contentHeight + INNER_BORDER * 2;

  const lastMoveBoxIds = useMemo(() => {
    if (gameMode === "bot" && activePlayer !== 1) return new Set<string>();
    return getLastMoveBoxIds(board, lastBotMoves);
  }, [lastBotMoves, board, activePlayer, gameMode]);

  const validBoxIds = useMemo(() => {
    const ctx = createMoveContext(activePlayer, turn);
    return new Set(getValidMoves(board, ctx).map((m) => m.boxId));
  }, [board, activePlayer, turn]);

  const canFreezeThisTurn = canInitiateFreezeTurn(turn);

  const interactiveBoxIds = useMemo(() => {
    const ids = new Set(validBoxIds);
    if (!canFreezeThisTurn) return ids;
    for (const box of Object.values(board.boxes)) {
      if (canFreezeBox(board, box.anchor.row, box.anchor.col, activePlayer)) {
        ids.add(box.id);
      }
    }
    return ids;
  }, [board, validBoxIds, activePlayer, canFreezeThisTurn]);

  const boxes = useMemo(() => Object.values(board.boxes), [board.boxes]);

  return (
    <View style={[styles.boardFrame, { padding: framePadding }]}>
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
          <BoxShapeLayer
            board={board}
            metrics={metrics}
            lastBotBoxIds={lastMoveBoxIds}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
          />

          {boxes.flatMap((box) => {
            if (!interactiveBoxIds.has(box.id)) return [];

            const canTap = validBoxIds.has(box.id);
            const canLongPressFreeze =
              canFreezeThisTurn &&
              canFreezeBox(board, box.anchor.row, box.anchor.col, activePlayer);

            const isExcluded =
              excludedBoxId !== null && box.id === excludedBoxId && !targetingMode;

            return box.cells.map((cell) => {
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
                      zIndex: 10,
                    },
                  ]}
                  delayLongPress={450}
                  onPress={
                    canTap
                      ? () => onTileTap(cell.row, cell.col)
                      : undefined
                  }
                  onLongPress={
                    canLongPressFreeze
                      ? () => onTileLongPress(cell.row, cell.col)
                      : undefined
                  }
                  disabled={
                    disabled ||
                    (isExcluded && !canLongPressFreeze) ||
                    (!canTap && !canLongPressFreeze)
                  }
                  hitSlop={4}
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
    backgroundColor: "transparent",
  },
});
