import { PowerContext, PowerDefinition, PowerResult } from "../types/powers";
import { getBoxAt, cloneBoard } from "../engine/board/boardFactory";
import { isBoxCaptured } from "../types/box";

const extraTapPower: PowerDefinition = {
  id: "extra_tap",
  name: "Extra Tap",
  description: "Get 3 clicks this turn instead of 2",
  icon: "⚡",
  targeting: "none",
  apply: (ctx: PowerContext): PowerResult => ({
    board: ctx.board,
    extraTapsThisTurn: 1,
    message: "Extra tap activated! 3 clicks this turn.",
  }),
};

const stealPower: PowerDefinition = {
  id: "steal",
  name: "Steal",
  description: "Capture an opponent's box as your own",
  icon: "🔄",
  targeting: "box",
  apply: (ctx: PowerContext): PowerResult => {
    if (!ctx.target) return { board: ctx.board };
    const box = getBoxAt(ctx.board, ctx.target.row, ctx.target.col);
    if (!box || !isBoxCaptured(box) || box.owner === ctx.player) {
      return { board: ctx.board, message: "Invalid steal target" };
    }
    const next = cloneBoard(ctx.board);
    next.boxes[box.id].owner = ctx.player;
    return { board: next, message: "Box stolen!" };
  },
};

const destroyPower: PowerDefinition = {
  id: "destroy",
  name: "Destroy",
  description: "Destroy an enemy captured box (resets to neutral)",
  icon: "💥",
  targeting: "box",
  apply: (ctx: PowerContext): PowerResult => {
    if (!ctx.target) return { board: ctx.board };
    const box = getBoxAt(ctx.board, ctx.target.row, ctx.target.col);
    if (!box || !isBoxCaptured(box) || box.owner === ctx.player) {
      return { board: ctx.board, message: "Invalid destroy target" };
    }
    const next = cloneBoard(ctx.board);
    const target = next.boxes[box.id];
    target.count = 0;
    target.owner = null;
    target.frozenBy = null;
    return { board: next, message: "Box destroyed!" };
  },
};

const freezePower: PowerDefinition = {
  id: "freeze",
  name: "Freeze",
  description: "Freeze a box — only your clicks count on it",
  icon: "❄️",
  targeting: "box",
  apply: (ctx: PowerContext): PowerResult => {
    if (!ctx.target) return { board: ctx.board };
    const box = getBoxAt(ctx.board, ctx.target.row, ctx.target.col);
    if (!box || isBoxCaptured(box)) {
      return { board: ctx.board, message: "Invalid freeze target" };
    }
    const next = cloneBoard(ctx.board);
    next.boxes[box.id].frozenBy = ctx.player;
    return { board: next, message: "Box frozen!" };
  },
};

export const POWER_REGISTRY: Record<string, PowerDefinition> = {
  extra_tap: extraTapPower,
  steal: stealPower,
  destroy: destroyPower,
  freeze: freezePower,
};

export function getPowerDefinition(powerId: string): PowerDefinition | undefined {
  return POWER_REGISTRY[powerId];
}

export function getAllPowers(): PowerDefinition[] {
  return Object.values(POWER_REGISTRY);
}

export function executePower(
  powerId: string,
  ctx: PowerContext
): PowerResult | null {
  const def = POWER_REGISTRY[powerId];
  if (!def) return null;
  return def.apply(ctx);
}
