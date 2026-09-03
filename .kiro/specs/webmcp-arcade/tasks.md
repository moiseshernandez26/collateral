# Tasks — Duel (WebMCP arcade)

Implementation order. Each task cites the requirements it satisfies. Check them
off as you finish and note what you learned in `docs/private/changelog.md`.

What's checked off is already in the working prototype.

---

## Phase 1 — Skeleton

- [x] 1.1 Vite + TypeScript project with header, arena, and call rail — _R12.1_
- [x] 1.2 State object `S` with `round` and `series` kept separate — _R5.10_
- [x] 1.3 Idempotent `paint()` that redraws everything from state — _R11.3_
- [x] 1.4 Tab system between the games — _R2.4_

## Phase 2 — Minesweeper engine

- [x] 2.1 9×9 board, deferred seeding, safe first cell — _R5.1, R5.2_
- [x] 2.2 Opening with cascade on zeros — _R5.3_
- [x] 2.3 Mine claim: hit keeps the turn, miss passes it — _R5.5, R5.6_
- [x] 2.4 Stepping on a mine awards a point to the opponent — _R5.4_
- [x] 2.5 Rejections: repeated cell, out of bounds, claim during `fresh` — _R5.7, R5.8_
- [x] 2.6 Round end and verdict by round points — _R5.9_
- [x] 2.7 Classic solo mode with flags and loss — _R6.1 to R6.5_

## Phase 3 — Connect 4 engine

- [x] 3.1 6×5 board with gravity drop — _R7.1, R7.2_
- [x] 3.2 Four-in-a-row detection in all four directions — _R7.4_
- [x] 3.3 Tie on a full board — _R7.5_
- [x] 3.4 Verified puzzle generator, with fallback — _R8.1 to R8.8_

## Phase 3b — Pong engine

- [x] 3b.1 Wall-clock simulation with substepping, immune to tunnelling — _R14.1, R14.2_
- [x] 3b.2 Blocking `pong_read` that parks until the ball turns — _R14.3, R14.7, R14.8_
- [x] 3b.3 Slow-motion window while the agent decides, with a timeout — _R14.4, R14.6_
- [x] 3b.4 One approach handed over at most once, so the loop can't spin — _R14.5_
- [x] 3b.5 Paddle move: clamped, rejected in solo and after the round — _R14.9_
- [x] 3b.6 Single-player survival off the left wall, best run kept — _R14.10_
- [x] 3b.7 Arrow-key paddle control, no pointer, released on blur — _R14.11, R14.12, R11.5_
- [x] 3b.8 Ready gate: a duel round waits for the human before the first serve — _R14.13, R14.15, R14.16_
- [x] 3b.9 `pong_ready` briefing tool, with the check-in shown on screen — _R14.14_
- [x] 3b.10 `next_action` on every response, so the agent stays in the loop — _R14.17_
- [x] 3b.11 Worker heartbeat, so a hidden tab keeps full speed — _R14.1_
- [x] 3b.12 Ball waits for the agent to ask, not only to answer — _R14.4, R14.6_
- [x] 7.4 Pill and empty rail distinguish "registered" from "an agent is calling" — _R10.5_
- [x] 7.5 Rail logs the tool list the browser actually holds, on every change — _R10.6, R10.7_
- [x] 7.6 Board clicks on the agent's turn are refused out loud, not swallowed — _R4.4_


## Phase 3c — Towers of Hanoi

- [x] 3c.1 Two towers of 5 discs, one clock, no turns — _R15.1, R15.3, R15.5_
- [x] 3c.2 Legal-move rule enforced, rejections cost nothing — _R15.2_
- [x] 3c.3 `hanoi_ready` starts the race so nobody gets a head start — _R15.4_
- [x] 3c.4 First tower finished wins, loser stops where it stands — _R15.6_
- [x] 3c.5 Clock from timestamps, immune to a throttled tab — _R15.7_
- [x] 3c.6 `hanoi_moves` gives legal moves, never the optimal one — _R15.8_
- [x] 3c.7 Each side sees the other's move count, not its tower — _R15.9_
- [x] 3c.8 Solo: clock on first move, best time kept, no opponent — _R15.10_

## Phase 4 — Deduction aids

- [x] 4.1 `ms_frontier` with `remaining` and `unknown` — _R9.1_
- [x] 4.2 `c4_analysis` with win, block, and traps — _R9.2_
- [x] 4.2b Pong's `intercept_y`, wall bounces resolved — _R9.5_

  Verified the way it has to be: 200 randomised shots, paddle parked on the
  predicted y, simulated to arrival — it never misses (`pong/query.test.ts`).
- [x] 4.3 Tune the descriptions against real agent play — _R9.4_

  No real agent was attached in this environment (no MCP inspector, no agent
  app running — see the mode picker in `main.ts`). As a proxy, added
  `minesweeper/agent-sim.test.ts` and `connect4/agent-sim.test.ts`: they drive
  the engine using nothing but `ms_frontier`/`c4_analysis`'s own output across
  dozens of randomized games and assert every deduction the tools hand out is
  actually correct. Both passed without needing logic changes. Still run the
  real ten-game check the first time an actual agent is available, per the
  original instructions here.

## Phase 5 — WebMCP layer

- [x] 5.1 Registration of the four core tools — _R1.1, R1.3_
- [x] 5.2 Per-game registration with `AbortController` — _R2.1, R2.2_
- [x] 5.3 Turn guard only on write tools — _R4.2, R4.5_
- [x] 5.4 Availability detection and fallback to solo mode — _R3.1, R3.2_
- [x] 5.5 `?duo=1` to force duel mode without an agent — _R3.6_
- [x] 5.6 Ask the human to pick duel or solo when WebMCP is present, instead
      of assuming an agent is attached — _R3.7_
- [x] 5.7 Review the `inputSchema`s against the inspector — _R1.4_

  Every write tool's arguments now carry a `description` with a range
  (`ms_reveal`/`ms_claim`'s `x`/`y`, `c4_drop`'s `column`, `switch_game`'s
  `game_id`), matching what each tool's own `description` already said in
  prose. `required` lists were already correct. Not unit-tested — `tools.ts`
  is DOM glue per `CLAUDE.md`'s testing boundary — verified by `tsc` (schemas
  satisfy `ModelContextTool`) and manual review; do a final pass with the
  actual Model Context Tool Inspector extension before a live demo.

## Phase 6 — Presentation

- [x] 6.1 Contrast between closed and open cells — _R11.1_
- [x] 6.2 Call rail with distinguished rejections — _R10.1 to R10.4_
- [x] 6.3 Hide every trace of an opponent in solo mode — _R3.3, R3.4, R3.5_
- [x] 6.4 Accessibility pass — _R11.5, R11.6_

  Found and fixed two real gaps: (1) `prefers-reduced-motion:reduce` disabled
  CSS transitions but anime.js animates via direct style writes, not CSS
  transitions, so it kept running — guarded both `window.anime` calls in
  `minesweeper/render.ts` and `connect4/render.ts` behind a `matchMedia`
  check. (2) the mode picker modal didn't trap focus: tabbing from page load
  landed on `#tabMs` behind the still-open dialog instead of `#pickAgent` —
  fixed in `main.ts` with `inert` on `.bar`/`.wrap` while the picker is open,
  focus moved into the dialog on open and back to `#tabMs` on choice. Cell
  focus rings (`:focus-visible`) were already in place for every interactive
  element. Verified live: forced `prefers-reduced-motion` via `matchMedia`
  override plus an `anime` call-counter spy (0 calls on drop/reveal, board
  state still correct), and tabbed through the picker with the keyboard to
  confirm the trap and hand-off.

- [x] 6.5 Test at 360 px wide — _R11.4_

  Found and fixed a real overflow: `.arena` (a CSS Grid item) had no
  `min-width:0`, so below the 900px breakpoint it refused to shrink under its
  content's intrinsic minimum width, overflowing the shared single-column
  track by ~20px — `.rail` inherited the same forced width since grid items
  in one column share a track. Added `min-width:0` (and `min-height:0`) to
  `.arena`/`.rail` in `style.css`. Verified at a true 360px CSS viewport (via
  a same-origin iframe, since this Chrome's window can't be resized below
  its OS minimum) with zero horizontal overflow on both games' boards.

## Phase 7 — Demo-ready

- [x] 7.1 Run the manual test checklist from `design.md`

  Ran it two ways. Pure-logic items got real automated coverage: first-cell
  safety across 20 boards and puzzle solvability across 15 skips are now
  tests in `minesweeper/actions.test.ts` / `connect4/actions.test.ts`; "no
  WebMCP → the word opponent never appears" was confirmed by grepping
  `src/` (it only shows up in code identifiers and tool descriptions the
  agent reads, never in solo-mode UI text). The WebMCP-specific items
  (claim chain, out-of-turn rejection, tool rotation) needed a live
  browser, since this environment has no MCP inspector extension installed
  — done directly against Chrome's real `document.modelContext` API
  (`getTools`/`executeTool`), acting as the inspector: calling `ms_reveal`
  before the human's first move returned the real `NOT_TURN` rejection;
  `ms_frontier` → `ms_claim` on the resulting board correctly identified
  and claimed a deduced mine. Contrast was checked visually via screenshot
  at both a normal viewport and 360px.

- [x] 7.2 Rehearse the three demo moments with the inspector open

  No MCP inspector extension available here, so rehearsed against the same
  real `document.modelContext` surface instead of a mock: (1) `getTools()`
  right after choosing "play vs agent" listed all 8 registered tools with
  names and schemas: page announces itself. (2) `executeTool` on
  `ms_frontier` then `ms_claim` played a real, correct move and changed the
  board: the agent plays. (3) `executeTool('switch_game', {game_id:'c4'})`
  flipped the tool list from the four `ms_*` tools to the three `c4_*`
  ones, and `ontoolchange` fired 7 times (4 removals + 3 registrations):
  the tools change on their own. All three held up.

- [ ] 7.3 Record the backup video — **skipped by explicit request**

  A recording was captured live (mode picker → duel → agent move via the real
  `document.modelContext` API with the call rail updating → tool rotation to
  Connect 4), but the user asked not to keep a demo/GIF, so the frames were
  discarded and none was exported. Still needed before an actual live demo,
  per the original note here — just not produced in this session.

- [ ] 7.4 Verify dependency licenses — _R12.4_

## Backlog

Ideas that fit later without redesigning anything:

- [x] Session metrics: calls per round, rejections, bad moves

  `src/metrics.ts` (pure, unit-tested) tracks `calls`/`callsThisRound`/
  `rejections`/`badMoves` from every agent tool call logged through `log.ts`.
  A "bad move" is a wrong `ms_claim` or a mine opened with `ms_reveal` — the
  app-level tool result already says so; `c4_drop` doesn't have an equivalent
  self-contained signal (that needs the prior turn's analysis), so Connect 4
  only gets calls and rejections. Shown as a compact line under "Agent calls"
  in the rail, reset per round and per match alongside `S.round`/`S.series`.

- [x] ~~Export the match as JSON to replay it~~ — **removed at the user's
      request**, they didn't need it. The call history it depended on went
      with it, since nothing else read it.

- [ ] `exposedTo` to share tools with a guest origin — investigated, not
      implemented

  Passing `exposedTo` to `registerTool` didn't throw in this Chrome, but
  that's inconclusive — unknown dictionary members are typically just
  ignored, and confirming real support needs an actual cross-origin guest
  (e.g. an iframe) checking whether it can see the tool, which nothing in
  this app currently is. More importantly, it doesn't fit the demo: every
  scenario here is "an external agent outside the tab calls tools this page
  registered," never "a guest page embedded inside this one." Building a
  fake guest iframe just to exercise an unverified, unused option would add
  speculative complexity with no real consumer. Left for whenever the demo
  actually grows a second-origin story.

- [x] A third minigame that reuses the tools layer and the call rail

  **Pong** — `src/pong/{state,actions,query,render,tools}.ts`, real-time
  rather than turn-based, plus 30 engine tests. Duel is first-to-5 against
  the agent; single player is a survival rally off the left wall, keeping
  the "no local bot opponent" rule. The whole design turns on `pong_read`
  being a *blocking* tool: see design.md's "Pong and the agent loop", and
  R14 in requirements.md.

  An earlier attempt at this slot was Nim, built end to end and then
  reverted because the user didn't like it (see changelog v11). It left
  behind one fix that stayed: `switch_game`/`new_round`'s `run` in
  `tools/core.ts` now awaits `startGame(...)`, so a second call landing
  right after can't abort the first's registration mid-flight.

  Bugs found while building Pong, all fixed and covered by tests or noted
  in design.md:
  - The agent could spin `read`/`move` against a single shot, because a read
    answered on "is the ball approaching" rather than "has this shot been
    handed over yet".
  - The mirror of that: marking a shot delivered when it *started* rather
    than when it was *handed over* made a read arriving slightly late skip
    the entire rally.
  - `requestAnimationFrame` does not run in a hidden tab, so the game froze
    solid whenever the tab lost visibility — which is exactly what happens
    when the agent lives in another window. Now driven off wall-clock time
    with a timer fallback.
  - The turn box stayed on "Rally" through the whole slow-motion window,
    because `paint()` only ran when a point landed.
  - Fixed-size `dt` capping plus paddle-face crossing tests, so no frame
    rate lets the ball tunnel through a paddle.

- [x] A fourth minigame — Battleship (v21), replaced by the Towers of Hanoi race (v22)

- [x] Remove the boot mode picker; register on load, switch modes from the bar

  The modal asked the right question at the wrong moment. It registered
  nothing until a human clicked, and an agent attaching to the tab lists the
  page's tools straight away — so it got an empty list and fell back to
  screenshot-and-click, the exact failure this demo exists to argue against.
  WebMCP detected now means duel mode with the core tools registered first;
  `#modeWrap` in the bar is the human's way to solo, and taking it calls
  `unregisterAllTools()` so nothing is left registered for a board the human
  is playing alone. That reverses R3.7 and design.md's section, both updated.
  Verified live: 8 tools on load with no interaction, 0 in solo, 8 again on
  return, no duplicates after three round trips.

- [x] Responsive pass for an agent-sized viewport

  The page is opened inside the agent's own browser window, which is narrower
  *and* shorter than a desktop tab. The real find was that nothing bounded the
  call rail: it gains a line per tool call, and a flooded rail measured 3907px
  tall, scrolling the board off the top of the screen mid-game. Now an app
  shell — `body{height:100dvh;overflow:hidden}`, board pane and rail scrolling
  independently. Board sizes moved to five `:root` tokens so one breakpoint
  resizes all four games; breakpoints on height as well as width; the two
  columns hold down to 660px instead of 900px, since stacking is what buries
  the rail. Swept 1440x900 down to 360x620 across all four games: no
  horizontal overflow, nothing clipped except Pong's rules at 560px tall,
  which scroll. Pong's rules block was also trimmed — it was long enough to
  squeeze the log to its floor on a 624px-tall window.

- [x] Re-verify Hanoi's tools (second pass)

  Schemas, all eight rejection paths with the tower left untouched, a full
  31-move solve through the tools with zero rejections, the post-race refusal,
  and tool rotation on `switch_game`. Two notes on the current Chrome, neither
  an app bug: `executeTool` wants its arguments as a JSON string and
  `getTools()` returns `inputSchema` serialized; and a subframe shares the
  top-level tool registry, so an iframe of the page doubled the tool list with
  duplicate names accepted. Fixed the last of the "1 moves" plurals — v23
  caught it in the tool text, but the on-screen clock and the round line each
  counted moves on their own; there is now one `plural()` they all call.

- [x] Tell the human what to say to their agent

  The page registering tools does nothing on its own, and a human who doesn't
  know what to ask for produces an empty rail — which looks exactly like a
  broken page. `src/say.ts` adds a "Say this to your agent" block in the rail
  with the phrase for the active game and a copy button, plus a short version as
  a hover tooltip on each game tab. The phrases restate the tool descriptions'
  own advice in the human's direction. Painted from `paint()`, so nothing in it
  runs before or during registration; tooltips are removed entirely in solo mode
  (R3.4) and gated on `(hover:hover) and (min-width:661px)`, because `.arena`
  scrolls and a tooltip wider than it would clip or add a scrollbar. Verified
  that WebMCP detection, the 8-tool registration on load and the per-game tool
  rotation are all unchanged.
