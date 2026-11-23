# Board Design Guide — Land Capture

A practical guide for **level designers** who want to build campaign boards without needing to know the bot code or advanced tactics. It explains how plot shapes, positions, and spacing interact with the game rules — especially **freeze**.

---

## Core rules (what the board must respect)

| Rule | Designer takeaway |
|------|-------------------|
| Each plot has a **size** (number of grid cells) | Bigger plots = more territory when captured, but need **more taps** to capture (size + 2). |
| Players get **2 taps per turn** | A full turn can be spent on one action (e.g. freeze) or two single-tap moves. |
| **Freeze** costs a **full turn** (2 taps) | Player must have captured land **touching** the neutral plot they want to freeze. |
| **Frozen plot** | Takes the freezer’s color + circled number. **Only the freezer captures** when count hits max (even if opponent made the last tap). |
| Tapping a **frozen** plot costs **2 taps** for +1 count | High commitment — good for tension on large boards. |
| **Capture** needs territory adjacency (after first capture) | Plots with **no path** from your land are unreachable until you break through. |
| **Same plot twice in one turn** | Second tap must be on a **different** plot. |

---

## Shape reference

| Shape | Cells | Taps to capture | Good for |
|-------|-------|-----------------|----------|
| Single | 1 | 3 | Filler, corridors, freeze targets |
| Horizontal / Vertical (2) | 2 | 4 | Small prizes, walls |
| Horizontal3 (3 wide) | 3 | 5 | Barriers, rim segments |
| L-shape | 3 | 5 | Corners, hooks, awkward borders |
| Zigzag | 3 | 5 | Diagonal “walls”, broken lines |
| Square (2×2) | 4 | 6 | Forts, anchors |
| Block3×2 | 6 | 8 | Mega objectives, late-game swings |

**Anchor** = top-left cell of the shape in the blueprint. All cells are filled relative to that anchor.

---

## What makes freeze **hard** (design goals for stages 14–20)

Freeze is easy when:

- Many **single** plots touch the edge of the board (capture one, freeze neighbors).
- Open centers with **no large shapes** blocking lines of territory.
- Symmetric layouts where both players reach the same plots equally fast.

Freeze is **hard** when:

1. **Territory gates** — Valuable singles sit **behind** multi-cell shapes. Players must capture a fort or corridor first, then freeze beyond it.
2. **Few border cells** — Large shapes eat the rim; only 1–2 singles connect regions.
3. **Chokepoints** — A single plot or pair connects two halves of the map. Controlling it controls who may freeze what.
4. **Deep singles** — Neutral 1×1 plots surrounded by L-shapes or zigzags: many taps to reach, then another full turn to freeze.
5. **Large prizes far from start** — 2×2 or 3×2 blocks in the center force long campaigns before freeze matters.

---

## Position patterns (copy these ideas)

### Corner forts (e.g. Stage 14 — Territory Lock)

```
[2×2]  [1×1]  [2×2]
  |      |      |
[wall]  singles [wall]
         ...
```

- Put **squares** in two corners of the same edge.
- Leave **one-cell gaps** between forts — those singles become early fights.
- Add **vertical doubles** on the sides so the middle is a separate “room.”
- **Effect:** Players race for corner forts; freezing central plots requires owning a wall or gate first.

### Rim siege (e.g. Stage 15 — Rim Siege)

- **Horizontal3** bars on north and south edges.
- **Vertical doubles** on east/west.
- **Square citadel** in the inner ring.
- Fill remaining space with singles in the **center pocket**.
- **Effect:** Center looks open but is only freezable from whoever wins the rim.

### Checkpoint bars (e.g. Stage 16 — Checkpoint Maze)

- Two **horizontal3** bars at different rows, offset horizontally.
- **Square vault** between them.
- **L-shapes** in opposite bottom corners.
- **Effect:** Territory advances in “steps.” Each bar is a checkpoint you must capture before freezing behind the next line.

### Four-quad arena (e.g. Stage 17 — Frozen Depths)

- **Square** in each corner of a 7×6 grid.
- **Short horizontal bridges** between quads (not overlapping).
- **L-shape** in the contested middle.
- **Effect:** Four mini-territories; freeze wars happen along bridges and the center hook.

### Mega wings (e.g. Stages 19–20)

- **Block3×2** on top-left and top-right (full width of a 6-column board).
- **Squares** and **L-shapes** in the middle band.
- **Horizontal3** and **zigzag** on the bottom row for late chokepoints.
- **Effect:** Early game is about mega blocks (8 taps!); freeze on smaller plots behind them decides the winner.

---

## How placement affects gameplay

| If you place… | Players will… |
|---------------|----------------|
| Singles along the **outer edge** | Capture and freeze quickly — good for tutorial stages. |
| **Square** on a **corner** | Fight for a large early territory; controls one side of the board. |
| **Square** in the **center** | Slow opening; whoever surrounds it controls adjacency. |
| **L-shape** blocking a row | Create a “hook” — only 2–3 cells touch the outside; strong freeze anchor once owned. |
| **Zigzag** between two regions | Soft wall with two exposed cells — contestable but slows rushes. |
| **Horizontal3** across the middle | Hard checkpoint; often requires 4–5 taps to capture, then freeze behind. |
| **Block3×2** | Long-term objective; freeze on adjacent singles matters more than fighting the block early. |
| Too many shapes, few singles | Cluttered, fast captures, **less** freeze depth. |
| Many singles between shapes | **More** freeze depth — designer sweet spot for stages 14–17. |

---

## Freeze-first checklist for a new board

Before shipping a level, ask:

1. **Can a player freeze a central plot on turn 1?**  
   If yes → too easy for freeze-focused stages (unless intentional).

2. **Is there at least one plot that requires 2+ captures before it borders friendly territory?**  
   If no → add a shape or move singles deeper.

3. **Are there 2–3 contestable choke singles?**  
   Good boards have obvious “keys” players fight over.

4. **Do large shapes overlap or leave holes?**  
   Blueprint validator skips invalid placements; always verify gaps fill with singles as intended.

5. **Board size vs. game length**  
   - 5×5 classic: ~8–12 minute duels, freeze-heavy.  
   - 7×6: more room for gates (~15–20 min).  
   - 8×6 with mega blocks: long games, decisive late freezes.

6. **Bot difficulty** (campaign only)  
   Higher bot levels use freeze in search. Hard boards (14–17, 19–20) should pair with **bot 7+** so freeze traps are punished.

---

## Campaign stage map (stages 11–20)

| Stage | Board | Focus | Bot |
|-------|-------|-------|-----|
| 11–13 | 5×5 classic | Learn freeze vs smart bot | 6–7 |
| 14–17 | 7×6 shaped | Territory gates, freeze planning | 7–8 |
| 18 | 5×5 classic | Pure tactics finale | 9 |
| 19–20 | 8×6 mega shapes | Block3×2, chokepoints, endgame | 9–10 |

---

## Adding a new stage (developer note)

1. Add an entry to `android/src/registries/campaignBlueprints.ts`.
2. Set `rows`, `cols`, `botDifficulty`, and optional `placements`.
3. Omit `placements` for a **classic grid** (all singles).
4. Shapes must not overlap and must fit inside the grid — invalid placements are skipped silently.
5. Remaining empty cells auto-fill with **single** plots.

---

## Glossary

- **Plot / box** — One capture unit (single or multi-cell shape).
- **Territory** — Captured plots (owned, count at threshold).
- **Freeze** — Mark a neutral plot; freezer color + circle; only freezer gets capture at max.
- **Chokepoint** — Plot whose owner controls access to a whole region.
- **Gate** — Small plot or corridor between two larger areas.

---

*This document is for designers and content authors. Game logic lives in `tapRules.ts`, `moveRules.ts`, and `campaignBlueprints.ts`.*
