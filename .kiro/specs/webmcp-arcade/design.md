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
| `pong_ready` | no | the full briefing — which paddle is the agent's, the loop — and checks it in on screen |
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

The same gap shows up again once the page is running, so the UI names it. The
whole API surface is `registerTool` / `getTools` / `executeTool` / `ontoolchange`
— there is **no signal for "a consumer is attached"**, and no way to add one. So
the honest proxy is whether a call has ever arrived: until one has, the pill
reads `N tools · waiting for agent` in the human colour rather than the
flattering `N tools active`, and the empty rail says the tools are registered and
waiting and that the thing to check is whether the agent is attached to this tab.
Without that, an agent silently ignoring the tools and a page that failed to
register them look exactly the same from the room.

The other half of that answer is evidence rather than assertion. `ontoolchange`
fires once per tool added or removed — a game switch fires it a dozen times — so
`registry.ts` debounces it, reads the list back with `getTools()`, and logs what
the **browser** holds as a distinct line in the rail. The reported tool count
comes from that read too, not from counting what we asked to register: a number
we compute ourselves says 8 whether or not registration worked. So an empty rail
now reads unambiguously — registration lines and no call lines means the tools
are there and nothing is calling them. It also puts the third demo moment on the
page itself instead of only in the inspector.

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

**The clock is wall time, not frames, and in a hidden tab it lives in a worker.**
`requestAnimationFrame` does not run in a hidden tab, and a hidden tab is not
hypothetical: the agent is usually driving from another window, which is exactly
when Pong has to keep going. The first fix for that was a `setInterval` fallback,
and it was not enough — measured in Chrome on a hidden tab:

| clock | ticks in 5 s (asked for 100) |
| --- | --- |
| `setInterval(50ms)`, main thread | 6 |
| `setInterval(50ms)`, dedicated worker | 103 |

Background pages have their timers clamped to about one a second, and worse after
a few minutes hidden. The symptom was not a slow game, it was a stopped one: the
ball froze, so `pong_read` never had a shot to hand over, so the agent's paddle
never moved — which from the room looks exactly like an agent that isn't playing.
Timers inside a dedicated worker aren't clamped, and the `message` it posts is
not a timer, so `clock.ts` runs the heartbeat there and the main thread ticks at
full rate. The worker is built from a blob, so there's still nothing to ship but
static files. rAF still drives while the tab is visible, both share `lastAt`, and
`maxTickMs` stays as a cap on any single catch-up slice.

**The round doesn't start itself.** Opening Pong in a duel used to serve on the
spot, which meant the first points went by while the human's hands were still off
the keys and the agent had not worked out that it had a paddle at all. Now
`startRound` only arms the round (`awaitingStart`); a modal explains the two
sides and waits for the human to press "Start rally". Escape dismisses it — a
modal you can't get out of is worse than the problem it solves — and the acts row
keeps a "Start rally" button for as long as the round is parked.

That pause is also where `pong_ready` earns its place. The agent is *told*, in
one piece and before anything is moving, that it is the blue paddle on the left,
that only `pong_move` moves it, and how the read/move loop runs; calling it flips
the modal's status line, so the room sees the agent has been briefed — or sees
that it hasn't, and went clicking around instead. `you_are` then rides along on
every single response, because a briefing read once is a briefing an agent can
drift away from. A read placed before the human presses Start isn't wasted: it
parks, and the serve wakes it through the ordinary `tryDeliver` path, so the
agent catches the very first shot. If Start never comes, it answers
`waiting_for_start` after `startPollMs` — soon enough to explain the silence,
seldom enough not to become a spin.

**The human plays with the arrow keys, and only with them.** There is no pointer
control, and its absence is a feature. An agent that fails to notice the tools
falls back on what it always has — screenshots, clicks, mouse moves — and with a
pointer-driven paddle the visible result is the agent dragging *the human's*
paddle around while its own sits still. That happened in testing, and it is a
confusing thing to have happen in front of a room. Keyboard-only makes the two
players physically separate: keys are the human's channel, tools are the agent's,
and neither can reach the other's. The tool descriptions say so out loud too
("never move the mouse, click, or screenshot — pong_read plus pong_move is the
whole game"), on the same principle as everywhere else here: when an agent
misbehaves, the fix goes in the description.

The paddle moves from held-key state read once per frame, not from the keydown
event, so holding a key glides at `paddleSpeed` px/s instead of stuttering along
with the OS key-repeat delay; Shift drops to `paddleFine` for the last few
pixels. `driveHumanPaddle` lives in `actions.ts` rather than `render.ts` for the
usual reason — that keeps it in the tested engine layer, with `render.ts` holding
nothing but the listeners. Keys are listened for on the window, not the canvas,
because requiring a click to focus the court first is exactly the kind of thing
that stalls a live demo; a `blur` handler releases everything, since a keyup that
lands while the tab is unfocused never arrives at all.

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
| Tab hidden during Pong | a worker heartbeat takes over from rAF and keeps full speed; a main-thread timer would be throttled to a crawl |
| Agent never answers a `pong_read` | slow-motion ends after `thinkTimeoutMs`, full speed resumes |
| Nothing comes at the agent | `pong_read` answers `event:'timeout'`, agent just calls again |
| Round parked behind the ready modal | `pong_read` answers `waiting_for_start` every `startPollMs`, and the serve wakes a parked read |
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
- Pong, the ready gate: click the Pong tab in a duel and confirm nothing moves
  until "Start rally" — then Escape out of the modal instead, and confirm the
  acts row still has the button and the ball is still parked.
- Pong, the briefing: call `pong_ready` from the inspector with the modal up and
  watch the status line flip to "agent checked in".
- Pong, the agent loop: `pong_read` must not answer while the ball is heading
  away; once it does, the court must visibly slow and say so; `pong_move` with
  the `intercept_y` it handed over must actually return the ball.
- Pong, no spin: two `pong_read` calls without a `pong_move` between them — the
  second must block, not answer instantly off the same shot.
- Pong, hidden tab: this is the demo's normal case, not an edge one — switch to
  another window mid-rally, let the agent play a few shots blind, and come back.
  The score must have moved on. A frozen ball here is the failure that reads as
  "the agent isn't moving its paddle".
- Pong, single player: no mention of an agent anywhere, and the left edge
  behaves as a wall rather than conceding points.
