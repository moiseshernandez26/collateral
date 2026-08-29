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

**Pong**, only while active:

| Tool | Read-only | Returns |
| --- | --- | --- |
| `pong_state` | yes | the court as text, immediately |
| `pong_read` | yes | **blocks** until the ball turns toward the agent, then the interception point |
| `pong_move` | no | where the paddle ended up, and resumes full speed |

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

Pong does not use `guard()` at all — it has no turns to be out of, and the
agent's paddle is its own the whole time. The rules it *can* break (moving in
single player, moving after the round is over, sending a non-number) are
checked inside `moveAgentPaddle` instead.

### Lifecycle

```js
if (gameCtrl) gameCtrl.abort();      // out with the previous game's tools
gameCtrl = new AbortController();
for (const t of GAME_TOOLS[id])
  await mc.registerTool(def(t), { signal: gameCtrl.signal });
```

Core tools register without a `signal`: they never leave.

`switch_game` and `new_round`'s `run` **must** be `async` and `await startGame(...)`
before returning — this was a real bug: an un-awaited `run` resolves as soon as
`startGame` is *called*, not once it finishes registering the new game's tools,
so a second `switch_game` (or even the same agent immediately calling a new tool)
can land while the previous switch's registration is still in flight, aborting it
mid-loop with an `AbortError`. `execute()` in `tools/helpers.ts` awaits whatever
`run` returns, so a synchronous `run` still works unchanged.

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

**`pong_read`'s `intercept_y`** projects the ball forward to the agent's paddle
plane and folds the top and bottom wall bounces back into the court
analytically, so the agent gets a single number to steer to. An agent asked to
derive it from raw `vx`/`vy` gets the reflections wrong often enough to lose
every rally — and unlike the other two games there is no time to think it
through twice.

## Connect 4 puzzle generator

Needed because Connect 4 has no single-player version. Algorithm:

1. Pick a four-cell line within the board and a direction.
2. Pick which of the four is the target cell; place the player's pieces on the
   other three.
3. Fill everything below each occupied cell by gravity, with random colors.
4. **Chaff:** stack 1-4 random extra pieces in every column other than the
   target, so the winning line isn't the only thing on the board and no
   column stays empty enough to be ruled out on sight.
5. Verify: the target column's lowest free cell is exactly the target, nothing
   sits above it, and the board doesn't already contain four in a row.
6. Simulate the shot. If it wins, the position is used; if any other column
   also wins, the chaff created a second solution — retry instead.

Up to 800 attempts, with a fixed fallback position. Verification uses the same
`checkLine` the game itself uses: if the puzzle passes, the engine agrees.

## Pong and the agent loop

The other two games wait politely for the agent. Pong does not, and that is the
point of including it: it shows WebMCP driving something continuous.

**The problem.** A tool call is request/response. One round-trip to an agent is
roughly 1–3 s. The ball crosses the court in under one. An agent that reads the
state once and answers once has already lost the point.

**The inversion.** Rather than the agent polling the ball, the page makes the
agent wait for it. `pong_read` returns a promise that is *not* settled when the
call arrives — it is parked until the ball turns toward the agent and crosses
62% of the court, and only then resolves, carrying `intercept_y`. So the agent's
ordinary rhythm — call a tool, read the answer, call the next tool — becomes the
rally itself, inside a single message turn. The tool description spells the loop
out explicitly, because that is where agent behaviour is actually specified:
read, move, read again, stop on `round_over`.

**Buying time.** From the moment a read is answered until `pong_move` lands, the
ball runs at 12% speed. That window is the agent's round-trip made visible: the
court draws "agent thinking · ball slowed" and a dashed line to where the ball
is going, so the room can see the agent was handed the answer and judge what it
did with it. A `thinkTimeoutMs` ends the window if the agent never answers, so a
stalled agent leaves the game slow-but-playable rather than frozen.

**One shot, one answer.** `approachFired` means *this shot has been handed to the
agent*, not *this shot started*. Both halves matter, and each was a real bug
before it was pinned down:

- If a read could resolve immediately whenever the ball happened to be
  approaching, an agent could spin read → move → read → move against a single
  shot, burning round-trips with the ball barely moving.
- If the flag were set when the approach *started* rather than when it was
  *delivered*, a read arriving a moment late would find the shot already marked
  and park until the next one — silently skipping the whole rally.

**The clock is wall time, not frames.** `requestAnimationFrame` does not run in a
hidden tab, and a hidden tab is not hypothetical: the agent may well be driving
from another window, which is exactly when Pong has to keep going. So a timer
takes over whenever frames stop arriving, and both drivers share one timestamp
so they can never double-step. Hidden play is degraded, not broken — browsers
clamp background timers to about a second, and `maxTickMs` caps how much of that
gap is simulated, so the game runs at roughly a quarter speed until the tab comes
back.

**Tunnelling.** The ball is integrated in substeps no longer than one radius, so
no frame rate, however coarse, can put it through a paddle. A hit only counts on
the substep that actually crosses the paddle's inner face, so a paddle slid into
place after the ball went by cannot catch it retroactively.

## Session metrics

`metrics.ts` is the one piece of state here that isn't part of a specific game:
it counts agent tool calls (total, per round, rejections, and "bad moves" — a
wrong `ms_claim` or a mine opened via `ms_reveal`, the only outcomes a tool's own
result says are bad without needing the previous turn's context). `log.ts` reads
it to paint both the rail's calls-per-round line **and** the header count — they
used to be two independent counters and drifted apart, because only one of them
was reset on a new match. `controller.ts`'s `startGame` resets the round counter
every round and the match counters on a fresh match, mirroring how
`S.round`/`S.series` already reset.

The rail caps itself at 120 entries. Pong's loop is chatty enough that an
uncapped rail would grow without bound over a long rally, and nobody reads the
bottom of it anyway.

## Presentation

An idempotent `paint()` redraws everything from state. No one mutates the DOM on
their own. It's more work per frame than strictly necessary, and that's fine:
the boards are 81 and 30 cells.

Pong is the exception: it draws to a canvas on its own clock, and calls `paint()`
only on the events the surrounding chrome cares about — a point landing, or the
slow-motion window opening or closing. Repainting the whole page 60 times a
second would be silly, and leaving the turn box stale while the agent thinks was
a bug.

Cell contrast, which already failed once: closed is dark sage green with an
`inset box-shadow` simulating relief; open is nearly white and flat. The
difference has to read from a meter away on a projector, not on a monitor at
30 cm.

Colors: human in brick red, agent in ink black for Connect 4 and violet for
minesweeper and Pong. Animations go through anime.js with a guard — if the CDN
fails, the game works without them. Pong uses none: its motion *is* the game, so
`prefers-reduced-motion` deliberately does not stop the ball. It only suppresses
the decorative animations in the other two games.

## Error handling

| Situation | Response |
| --- | --- |
| `document.modelContext` missing | solo mode, rail hidden |
| `registerTool` throws | solo mode, error to console |
| Argument out of range | `ok:false` with prose `reason` |
| Move out of turn | `ok:false`, state untouched |
| anime.js CDN down | no animations, everything else the same |
| Puzzle generator exhausted | fallback position |
| Tab hidden during Pong | timer takes over from rAF, ~quarter speed, never frozen |
| Agent never answers a `pong_read` | slow-motion ends after `thinkTimeoutMs`, full speed resumes |
| Nothing comes at the agent | `pong_read` answers `event:'timeout'`, agent just calls again |
| Game switched with a `pong_read` parked | the waiter is settled; the browser also rejects the in-flight call, since the tool it was waiting on no longer exists |

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
- Tool rotation race: call `switch_game` twice in a row without pausing between
  calls and confirm the final tool list is exactly the last game's tools plus
  the four core ones, with nothing left over from a call that landed mid-flight
  (this is what exposed the `switch_game` await bug above).
- Pong, the agent loop: `pong_read` must not answer while the ball is heading
  away; once it does, the court must visibly slow and say so; `pong_move` with
  the `intercept_y` it handed over must actually return the ball.
- Pong, no spin: two `pong_read` calls without a `pong_move` between them — the
  second must block, not answer instantly off the same shot.
- Pong, hidden tab: switch to another window mid-rally and come back. The ball
  must have kept moving (slower), not frozen at the position you left it.
- Pong, single player: no mention of an agent anywhere, and the left edge
  behaves as a wall rather than conceding points.
