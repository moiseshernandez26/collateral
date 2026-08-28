# Design — Duel (WebMCP arcade)

Covers the requirements in `requirements.md`. Read it before touching code.

## Architecture

A Vite + TypeScript project, client-only, no backend. Five layers, with one
dependency rule: **a layer may only call downward, never upward.**

```
┌──────────────────────────────────────────────┐
│ Tools layer      registration and guards     │  ← WebMCP
├──────────────────────────────────────────────┤
│ Orchestration    mode, turn, game switching  │
├──────────────────────────────────────────────┤
│ Engines          minesweeper · connect 4     │  ← pure logic
├──────────────────────────────────────────────┤
│ Presentation     DOM painting                │
├──────────────────────────────────────────────┤
│ Log              call rail                   │
└──────────────────────────────────────────────┘
```

In the code, this maps to `src/`: each game's `actions.ts`/`query.ts` are the
engine, `render.ts` is presentation, `tools.ts` plus `tools/*` is the tools
layer, `controller.ts` is orchestration, and `log.ts` is the log. See
`CLAUDE.md`'s architecture section for the exact module layout and the
intentional import cycle between `controller.ts` and the per-game modules.

The engines don't know who called them. The same `claim(x, y, who)` function
serves both a human click and an agent tool call. That symmetry is what makes the
rules apply equally to both, and it's the property that must not be broken.

## State model

A single global object `S` is the only source of truth. Each engine keeps its
board in its own module because its shape differs per game.

```js
S = {
  game:  'ms' | 'c4',
  duel:  boolean,          // there's an agent opponent
  mcp:   boolean,          // WebMCP available
  turn:  'human' | 'agent',
  over:  boolean,
  verdict: string,
  round:  { human, agent },   // points WITHIN the round
  series: { human, agent },   // rounds won
  solo:   { msWins, c4Solved }
}
```

**`round` and `series` are distinct and never mixed.** This is the bug that
already happened once: mine points were added to the rounds-won counter, so the
verdict compared accumulated totals instead of that round's points.

## Round states

```
        ┌──────────┐  first opening      ┌─────────┐
        │  fresh   │────────────────────►│ playing │
        └──────────┘  (seeds the mines)  └────┬────┘
                                              │ end condition
                                              ▼
                                         ┌─────────┐
                                         │  over   │
                                         └─────────┘
```

`fresh` only exists in minesweeper and is what guarantees the first cell is
never a mine. Claiming during `fresh` is rejected: the board doesn't exist yet.

## Tool contracts

**Core**, live for the whole session:

| Tool | Read-only | Returns |
| --- | --- | --- |
| `get_match` | yes | game, turn, `your_turn`, points, rounds |
| `list_games` | yes | catalog with which one is active |
| `switch_game` | no | switches game, rotates tools |
| `new_round` | no | new round, keeps rounds won |

**Minesweeper**, only while active:

| Tool | Read-only | Returns |
| --- | --- | --- |
| `ms_board` | yes | board as text |
| `ms_frontier` | yes | deducible constraints |
| `ms_reveal` | no | result, points, mines remaining |
| `ms_claim` | no | hit or miss, whether the turn is kept |

**Connect 4**, only while active:

| Tool | Read-only | Returns |
| --- | --- | --- |
| `c4_board` | yes | board as text |
| `c4_analysis` | yes | win, block, traps |
| `c4_drop` | no | row, column, whether it won |

Every write response carries `ok`. If `false`, it carries a prose `reason` and
state is left untouched. If `true`, it carries the relevant new state and
`your_turn`, so the agent knows whether it keeps playing without having to ask
again.

### Turn guard

```js
const guard = fn => a => agentMayAct() ? fn(a) : NOT_TURN;
```

Wraps **only** the write tools. Read tools always pass through: the agent
thinking outside its turn bothers no one, and it arrives ready when its turn
comes.

### Lifecycle

```js
if (gameCtrl) gameCtrl.abort();      // out with the previous game's tools
gameCtrl = new AbortController();
for (const t of GAME_TOOLS[id])
  await mc.registerTool(def(t), { signal: gameCtrl.signal });
```

Core tools register without a `signal`: they never leave.

### Mode picker

`document.modelContext` existing only proves the browser *can* register
tools — it says nothing about an agent actually being attached to call them
(no agent app running, no MCP inspector connected). So on boot, if the API is
present, the page shows a modal asking the human "play vs agent" or "play
solo" instead of assuming duel mode. Choosing solo skips tool registration
entirely and behaves exactly like the no-WebMCP path; choosing vs-agent runs
the normal registration flow. When the API is absent, boot proceeds straight
to solo mode as before — there's nothing to ask about.

## The deduction aids

This is the real work of the project. Without them the agent plays poorly and
the demo falls apart.

**`ms_frontier`** walks every open numbered cell and returns
`{ cell, value, already_found, remaining, unknown[] }`. With that the agent
applies two trivial rules: if `remaining === unknown.length`, all of them are
mines and it can chain them with `ms_claim` while keeping the turn. If
`remaining === 0`, all of them are safe. The alternative — deducing the geometry
by reading the ASCII drawing — fails in practice.

**`c4_analysis`** simulates every legal column for both the agent and the human
and returns `winning_now`, `must_block`, and `gives_opponent_a_win`. The last one
is computed by placing the agent's own piece and testing whether the human wins
right above it. With those three lists the agent plays well without knowing
anything about Connect 4.

## Connect 4 puzzle generator

Needed because Connect 4 has no single-player version. Algorithm:

1. Pick a four-cell line within the board and a direction.
2. Pick which of the four is the target cell; place the player's pieces on the
   other three.
3. Fill everything below each occupied cell by gravity, with random colors.
4. Verify: the target column's lowest free cell is exactly the target, nothing
   sits above it, and the board doesn't already contain four in a row.
5. Simulate the shot. If it wins, the position is used; if not, retry.

Up to 800 attempts, with a fixed fallback position. Verification uses the same
`checkLine` the game itself uses: if the puzzle passes, the engine agrees.

## Presentation

An idempotent `paint()` redraws everything from state. No one mutates the DOM on
their own. It's more work per frame than strictly necessary, and that's fine:
the boards are 81 and 42 cells.

Cell contrast, which already failed once: closed is dark sage green with an
`inset box-shadow` simulating relief; open is nearly white and flat. The
difference has to read from a meter away on a projector, not on a monitor at
30 cm.

Colors: human in brick red, agent in ink black for Connect 4 and violet for
minesweeper. Animations go through anime.js with a guard — if the CDN fails, the
game works without them.

## Error handling

| Situation | Response |
| --- | --- |
| `document.modelContext` missing | solo mode, rail hidden |
| `registerTool` throws | solo mode, error to console |
| Argument out of range | `ok:false` with prose `reason` |
| Move out of turn | `ok:false`, state untouched |
| anime.js CDN down | no animations, everything else the same |
| Puzzle generator exhausted | fallback position |

Reasons are written for the agent to read and correct from: `'out of bounds, x
and y range from 0 to 8'` works; `'invalid input'` doesn't.

## Testing

Manual, since there's no dedicated test suite yet. Minimum checklist before any
demo:

- Claim chain: the agent chains several correct `ms_claim` calls without losing
  its turn.
- Out of turn: invoke `ms_reveal` from the inspector while it's the human's turn.
- Tool rotation: switch games with the inspector open and watch the list mutate.
- First cell: twenty new games, none lost on the first click.
- Puzzles: fifteen "skip puzzle" in a row, all solvable.
- No WebMCP: open in a Chrome without the flag and confirm the word "opponent"
  never appears anywhere.
- Contrast: look at the board from three meters away.
