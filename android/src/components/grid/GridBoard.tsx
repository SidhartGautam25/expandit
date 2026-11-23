import React, { useMemo, useRef } from "react";
import { StyleSheet, View, Pressable, useWindowDimensions, PanResponder } from "react-native";
import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { Coord, Direction } from "../../types/box";
import { TurnState } from "../../types/session";
import {
  fitBoardLayout,
  getBoardContentSize,
  getBoardMetrics,
} from "../../engine/board/boardLayout";
import { TerritoryBoardLayer } from "./TerritoryBoardLayer";
import { GAME_SCENE } from "../../constants/theme";
import type { GameLayoutDensity } from "../../utils/gameLayoutDensity";

const INNER_BORDER = 1;

interface GridBoardProps {
  board: GameBoard;
  onTileTap: (row: number, col: number) => void;
  onTileLongPress?: (row: number, col: number) => void;
  onExpandDirection?: (boxId: string, dir: Direction) => void;
  selectedBoxId?: string | null;
  onSelectBox?: (boxId: string | null) => void;
  disabled: boolean;
  lastBotMoves: Coord[];
  activePlayer: Player;
  turn: TurnState;
  targetingMode?: boolean;
  excludedBoxId?: string | null;
  gameMode?: "bot" | "pvp";
  player1ColorHex?: string;
  player2ColorHex?: string;
  availableHeight?: number;
  layoutDensity?: GameLayoutDensity;
}

export function GridBoard({
  board,
  onTileTap,
  onExpandDirection,
  selectedBoxId = null,
  onSelectBox,
  disabled,
  activePlayer,
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

  // Touch tracking for tap vs swipe
  const touchStartRef = useRef<{ x: number; y: number; row: number; col: number } | null>(null);

  const handleCellTouchStart = (row: number, col: number, e: any) => {
    const nativeEvent = e.nativeEvent;
    touchStartRef.current = {
      x: nativeEvent.pageX,
      y: nativeEvent.pageY,
      row,
      col,
    };
  };

  const handleCellTouchEnd = (row: number, col: number, e: any) => {
    if (disabled || !touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    const nativeEvent = e.nativeEvent;
    const dx = nativeEvent.pageX - start.x;
    const dy = nativeEvent.pageY - start.y;
    const distSq = dx * dx + dy * dy;

    const boxId = board.cellMap[row]?.[col];
    const box = boxId ? board.boxes[boxId] : null;

    // Check if it's a swipe on an owned block
    if (box && box.owner === activePlayer && distSq > 400) {
      let swipeDir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        swipeDir = dx > 0 ? "right" : "left";
      } else {
        swipeDir = dy > 0 ? "down" : "up";
      }
      onExpandDirection?.(box.id, swipeDir);
      return;
    }

    // Otherwise, normal tap
    onTileTap(row, col);
  };

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
          {/* Main Visual Board Layer */}
          <TerritoryBoardLayer
            board={board}
            metrics={metrics}
            activePlayer={activePlayer}
            selectedBoxId={selectedBoxId}
            onSelectBox={(boxId) => onSelectBox?.(boxId)}
            onExpandDirection={onExpandDirection}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
            disabled={disabled}
          />

          {/* Interactive Tap & Swipe Grid Layer */}
          {Array.from({ length: board.rows }).map((_, r) =>
            Array.from({ length: board.cols }).map((_, c) => {
              const left = metrics.boardPadding + c * (metrics.cellSize + metrics.gridGap);
              const top = metrics.boardPadding + r * (metrics.cellSize + metrics.gridGap);

              return (
                <Pressable
                  key={`tap-cell-${r}-${c}`}
                  onTouchStart={(e) => handleCellTouchStart(r, c, e)}
                  onTouchEnd={(e) => handleCellTouchEnd(r, c, e)}
                  style={[
                    styles.tapCell,
                    {
                      left,
                      top,
                      width: metrics.cellSize,
                      height: metrics.cellSize,
                      zIndex: 15,
                    },
                  ]}
                  disabled={disabled}
                  hitSlop={2}
                />
              );
            })
          )}
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
