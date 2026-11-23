# Land Capture — AI Engine

How the bot chooses a move. Search **depth is unchanged** (still `LEVEL_REGISTRY[level].searchDepth`). What changed is **what a position is worth**, **which moves are even considered**, and **which plots look important**.

Code: `android/src/engine/ai/aiEngine.ts`  
Rules the eval encodes: `tapRules.ts`, `moveRules.ts`, `winRules.ts`, `boundary.ts`

---

## Why the old bot looked stupid

The search was already looking ahead. The **leaf evaluator and move ranking** were not speaking the language of this game.

| Mistake you saw | Why it happened |
|-----------------|-----------------|
| Tap own captured land | Own land sits at max **count**. Ordering used `count`, so self-attacks ranked like strong moves. A tap there **uncaptures**. |
| Tap opponent frozen plot | Frozen plots still looked like “progress.” Tapping them costs **2 taps** and raises **their** count. At one-before-capture, you **hand them the plot**. |
| Ignore big / key plots | Eval scored “owned size × 18” and a little freeze bonus. A 6-cell block and a 1-cell filler were almost the same story. |
| Miss obvious captures / freezes | Leaves did not reward “this plot is **our** frontier” vs “tapping here **feeds** them.” |
| Worse in the late game | Branching explodes. `MAX_NODES` cuts the tree. Bad **move order** meant the first (often silly) lines were the only ones searched; that incomplete result was played. |

Search depth was not the bottleneck. **Weights, territory sense, and poison-move filters** were.

---

## How a decision is made (pipeline)

```
legal taps + freezes
    → drop poison taps (never search these)
    → rank remaining moves (captures, contested freezes, big frontier plots first)
    → 1-ply static eval of every remaining root move  → fallback choice
    → minimax / alpha-beta at configured depth
    → at depth 0: if a capture or big freeze is sitting there, peek at it (tactical leaf)
    → if the node budget ran out, trust static ranking first
    → play the first action that still passes the real rule gates
```

Easy levels still **blunder** (`blunderRate`) by picking a random **non-poison** move. They no longer “blunder” into tapping your freeze or demolishing their own land.

---

## Poison taps (the bot must not do these)

These are still legal for a human. The bot **removes them from the search**.

1. **Own captured plot** — reduces count and can uncapture. That is not a plan; it is sabotage.
2. **Opponent frozen plot** — freeze means **only the freezer captures**. Your tap is unpaid labor on their plot, at double tap cost.
3. **Plot that only touches opponent territory** (after you already have land) — you cannot capture it; filling it makes an orphan **they** absorb. You are paving their street.
4. **Matured orphans in general** — they absorb on their own when land touches them. Tapping them **lowers** count and wastes a turn. Exception: a **contested** orphan already `claimedBy` the opponent — tapping can knock it off max so they do not absorb it.

If every “smart” move is gone, the bot falls back to remaining legal taps so it never stalls the turn.

---

## Territory sense

The board is not a bag of tiles. After the **first** capture, you only capture plots that **touch your owned land**. Freeze also requires that adjacency. The evaluator labels every unowned plot:

| Label | Meaning | Bot attitude |
|-------|---------|----------------|
| **Ours (owned)** | `owner === bot` | Real territory. Enables capture + freeze next door. Highest value (`TERRITORY × size`). |
| **Theirs (owned)** | opponent land | Same weight, negative. Also pays them **choke** (new doors that land opens). |
| **Own freeze** | `frozenBy === bot`, not owned yet | Counts for **win occupancy and score** (see `winRules`) but is **not** adjacency. Good lock, still needs a later capture to grow the frontier. |
| **Opp freeze** | they locked it | Do not tap. Treat as almost-lost points. |
| **Frontier unique (ours)** | unowned, touches us, not them | **Maybe-our-territory.** Develop, capture, or freeze. Size and choke matter. |
| **Frontier unique (theirs)** | touches only them | **Their prey.** Do not invest taps. |
| **Contested** | touches both | Race. Freeze is usually the right weapon: lock the points and deny their capture. |
| **Interior** | touches nobody’s land | Only the **opening** (no land yet) should dump taps here. Later, low priority unless it is a path to a prize. |
| **Matured orphan** | at max count, not owned | Absorbs to freezer, or to the unique bordering owner, or to `claimedBy` if both border. Connecting to **our** orphan is a capture without extra taps. |

**Choke / strategic importance:** if we owned this plot, which **new** unowned neighbors would suddenly touch our land? That extra size is `CHOKE`. A corridor or a 2×2 that opens a pocket beats a same-size dead-end.

**First capture:** neither side has land, so every plot is “interior.” Eval then prefers **large size + high choke** so the opening claim is a fort, not a random 1×1.

---

## Evaluation terms and weights

Constants: `EVAL` in `aiEngine.ts`. All size-based so a block3×2 (6) dwarfs a single (1).

| Term | Weight | What it measures |
|------|--------|------------------|
| `TERRITORY` | **100 × size** | Captured land. This is how the match is scored. Must dominate. |
| `FROZEN_LOCK` | **70 × size** | Frozen plots already count as occupied points for the freezer at game end, but they **do not** spread adjacency. Slightly less than a real capture. |
| `CAPTURE_READY` | **38 × size** | One tap from becoming **ours** (threshold − 1, and we are allowed to capture: no land yet, or we border it, and it is not their freeze). |
| `OPP_CAPTURE_READY` | **42 × size** (minus) | They can finish it next. Urgent to freeze or ignore if we cannot stop it. |
| `FRONTIER_UNIQUE` | **24 × size** | Plot that can become our land (or theirs, as a penalty). |
| `CONTESTED` | extra size + freeze mobility | Both can take it; freeze value is boosted in move order. |
| `INTERIOR` | **5 × size** | Weak unless it is still the opening. |
| `PROGRESS` | **16 × size × (count / threshold)** | Taps already invested — **only** credited if `futureOwner` is us (or half on contested if `claimedBy` is us). Progress on **their** plots scores for them. |
| `CHOKE` | **10 × newly unlocked neighbor size** | Strategic doors, not just raw area. |
| `ORPHAN` | **30 × size** | Ripe fruit waiting for a connection. |
| `MOBILITY` | **3 × freeze-target size** | Having freeze options is a plan, not a panic. |
| `WIN` | **100000** | Terminal win/loss, plus point margin × `TERRITORY`. |

### Future owner (who the plot is “for”)

1. Already owned → that owner.  
2. Frozen → freezer (even if you tap last).  
3. Unique frontier → that player.  
4. Contested → neither; `claimedBy` only tilts progress.  
5. Interior with no land on the board → `claimedBy` if set.

That is how the bot knows **tapping here helps us** vs **tapping here helps them**.

---

## Move priority (ordering + static 1-ply)

Search still uses alpha-beta. **Order** decides what gets the node budget. Static 1-ply (`evaluateBoard` after the move + a slice of the order score) is the late-game safety net.

Rough **root priority**:

1. **Capture now** — especially large / high-choke plots. Growing land is how you freeze and capture the rest.  
2. **Freeze contested or large frontier plots** — full turn (2 taps), locks win-points, stops them taking it. Best when they already have count on it or it is one-before-capture.  
3. **Tap our freeze** when it is on the border and about to become real territory (expansion).  
4. **Develop unique frontier** — raise count on plots we will actually own. Bigger first.  
5. **Opening claim** — largest plot with the most new neighbors.  
6. **Interior / low** — only if nothing else is on the menu.  
7. **Never** (filtered): own land, their freeze, their unique frontier.

### Tips the weights are trying to play

- **Capture expands; freeze locks.** Freeze a prize you cannot keep in a tap-war. Capture when you need adjacency for the next prize.  
- **Do not donate.** Opponent freeze and opponent-only border plots are gifts.  
- **Big plots swing the score.** Threshold is `size + 2`, but the **points** are `size`. Racing a 4- or 6-cell shape is worth many singles.  
- **Chokepoints first.** A small plot that opens a vault is not “small.”  
- **Orphans.** If you claimed a maxed plot in the interior, **walk land toward it**; do not tap it down.  
- **Late game.** Frozen remaining border plots can **end the occupancy clock** while keeping the points. The freeze lock weight exists for that.  
- **Two taps.** Freeze or a frozen-plot tap **consumes the whole turn**. Do not freeze a unique 1×1 you could have walked in with normal taps unless you need the lock.

---

## Search (unchanged depth, smarter leaves)

| Level | Depth | Blunder | Notes |
|-------|-------|---------|--------|
| 1–4 | 1–4 | 60% → 5% | Random among **sane** moves. |
| 5–10 | 5–10 | 0% | Full eval + ordering. |

- `MAX_NODES = 60000` still applies. When it trips, the bot plays the **best 1-ply evaluated** root move, not “whatever branch was open when the counter died.”  
- **Tactical leaf:** at depth 0, if a capture or a large/one-before freeze is available, the leaf takes the best of “stand pat” vs “play that shot.” That is not extra configured depth; it stops the bot from walking past a hanging capture because the horizon ran out.  
- Minimax still tracks taps remaining, same-plot exclusion, danger-plot pairing, and freeze-only-on-fresh-turns.

---

## What “smart” means in this ruleset

1. Know **our land**, **their land**, **locked freeze**, **soon-ours**, **soon-theirs**, **contested**, **interior**.  
2. Spend taps only where **futureOwner** is us (or contested we intend to freeze).  
3. Prefer **size × strategic doors**, not “highest number printed on the tile.”  
4. Treat freeze as a **scoring lock + denial tool**, not as a random button.  
5. Keep the late game from collapsing into node-limit noise.

---

## File map

| Piece | Role |
|-------|------|
| `evaluateBoard` | Positional score for `player` |
| `frontierKind` / `futureOwner` / `chokeValue` | Territory sense |
| `isPoisonTap` | Hard filter |
| `orderScore` | Alpha-beta move order |
| `leafScore` | Capture/freeze peek at horizon |
| `staticRootBest` | Late-game / node-limit choice |
| `getBotActionForLevel` | Public entry (session hook) |

Human rules and UI are unchanged. Only the bot’s judgment changed.
