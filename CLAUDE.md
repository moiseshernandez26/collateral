# CLAUDE.md — Duel

Guide for any agent working in this repo. Read it in full before touching code.

## What this is

A minigame arcade in the browser where the opponent is an **external agent**
playing by calling WebMCP tools. Four games, each making a different point:
a minesweeper duel and Connect 4 are turn-based; Pong is real-time, to show that
WebMCP isn't limited to games that wait politely for the agent; and Hanoi is a
race against one clock, which is where the room sees what an agent's move
actually costs — a round-trip each — and what it buys, which is knowing the
algorithm.

## The real goal

**This is an internal demo to teach WebMCP at work.** It's not a product; no one
will use it after the meeting.

That defines the success criteria, and they differ from a normal app's:

| Matters | Doesn't matter |
| --- | --- |
| That it's understandable without knowing the tech | That it's original |
| That the key moment is visual | That it's useful to anyone |
| That it doesn't crash live | That it scales |
| That the WebMCP mechanism is exposed | That it has users |

If a decision improves utility but gets in the way of demo clarity, clarity
wins.

## The three demo moments

The entire design exists so these three moments work. Don't break them.

1. **The page announces itself.** The inspector opens and the tools are right
   there with names and schemas. Nobody guessed anything: the page declared
   what it can do.
2. **The agent plays.** Every call shows up live in the right-hand rail with its
   arguments and its response. That rail is what turns a game into a WebMCP
   demo.
3. **The tools change on their own.** When the game switches, `AbortController`
   unregisters the previous game's tools and registers the new one's. The
   inspector's list transforms live. Nobody else uses that part of the standard.

## Hard constraints

- **Nothing leaves the tab.** No backend, no API key, no calls to any LLM from
  the app. The app only registers tools; the intelligence lives outside.
- **The API is `document.modelContext.registerTool()`.** `navigator.modelContext`
  was deprecated in Chrome 150. Don't use it, not even as a fallback.
- **Vite + TypeScript project, no backend.** It stopped being a single HTML file
  with no build step (see `docs/private/changelog.md` for when and why). It's
  still 100% client-side: `npm run build` produces a static `dist/` that gets
  served or opened the same way as before, just no longer a direct double-click
  on the source.
- **Every module in `src/` stays under ~200 lines.** That's the reason for the
  split into `state.ts` / `actions.ts` / `query.ts` / `render.ts` / `tools.ts`
  per game. A file approaching the limit gets split again, not stretched.
- **anime.js still loads from a CDN, guarded** (`if (window.anime)`), pulled in
  from `index.html`, never as an npm dependency or a hard requirement.
- **MIT-only libraries.** Today: anime.js 3.2.1.
- **No WebMCP, single player.** Not a local bot opponent, not playing both sides:
  a real single-player mode, and the interface doesn't mention an opponent
  anywhere.
- **WebMCP being available doesn't mean an agent is attached.** The API
  existing only proves the browser can register tools, not that anything is
  listening. Ask the human ("play vs agent" or "play solo") before assuming
  duel mode — don't go back to auto-entering duel mode on detection alone.

## How tools are designed here

Three rules earned the hard way:

1. **Give the agent constraints, not drawings.** `ms_frontier` and `c4_analysis`
   hand it the deduction already worked out. Without them the agent plays badly
   and the demo falls apart. They're the real work of this project.
2. **The page enforces the rules.** A tool called out of turn responds
   `{ ok:false, reason:'not your turn' }`. The agent can't cheat even if it
   wants to. Provoking it live is good demo material.
3. **The description is the code.** When the agent plays badly, the fix is
   almost always in the `description` text, not the logic. Edit there first.

## Commands

- `npm run dev` — dev server with HMR (Vite), usually at
  `http://localhost:5173`.
- `npm run build` — runs `tsc` (strict typecheck, no emit) then the production
  build to `dist/`.
- `npm run preview` — serves the already-built `dist/`, to test the real build.
- `npm run test` — runs the Vitest suite once (`vitest run`).
- `npm run test:watch` — Vitest in watch mode.

## How to test

- Chrome 149 or later with `chrome://flags/#enable-webmcp-testing` enabled.
- **Model Context Tool Inspector** extension to inspect and run tools by hand.
- Without an agent: `?duo=1` in the URL (e.g. `http://localhost:5173/?duo=1`)
  forces duel mode to test the interface.
- **Dev serves plain HTTP by default**, so `npm run dev` gives you
  `http://localhost:5173` with no certificate warning. WebMCP still works there:
  Chrome treats `http://localhost` as a secure context.
- **Testing over a LAN IP needs HTTPS**, and that is opt-in:
  `HTTPS=1 npm run dev -- --host` serves `https://<your-ip>:5173` via
  `@vitejs/plugin-basic-ssl`. Chrome does *not* extend the localhost exemption
  to a bare `192.168.x.x` address, so without it `document.modelContext` is
  simply absent and the app quietly falls back to solo mode — the failure looks
  like "WebMCP isn't supported", not like a certificate problem, which is what
  makes it worth remembering. Expect a self-signed certificate warning on first
  visit per device; click through it once ("Advanced" → "Proceed").
- Before any live demo: have the recorded backup video ready. It's a feature
  behind a flag.

## Code architecture

`src/main.ts` is the only entry point: it imports `style.css` and checks
whether WebMCP is available (`document.modelContext`). If it isn't, it goes
straight to solo mode. If it is, availability alone doesn't mean an agent is
attached to call the tools (no agent app running, no MCP inspector
connected), so it shows a modal (`#picker` in `index.html`) asking the human
to pick duel or solo before registering anything. Either path ends by calling
`startGame('ms', false)` from `controller.ts`.

`state.ts` holds the single shared state (`S`): active game, whether it's a
duel, turn, scoreboard. Any module imports it and mutates it directly.

Each game lives in its own folder (`minesweeper/`, `connect4/`, `pong/`), split
the same way:
- `state.ts` — mutable board data and mode toggles (flags, claiming).
- `actions.ts` — moves that mutate state; return both the tool-shaped result
  (`{ ok, reason, ... }`) and whatever render needs (opened cells, the dropped
  cell) to animate.
- `query.ts` — the read-only tools (`ms_frontier`, `c4_analysis`, Pong's
  `intercept_y`, the `_board`s).
- `render.ts` — builds the grid and repaints it; clicks call into `actions.ts`
  and then into `controller.ts`'s `paint()`.
- `tools.ts` — assembles the game's `ToolDef`s using `guard()` from
  `tools/helpers.ts`.

`pong/` carries three more, each split out to stay under the line limit and each
covering something the other games don't have: `agent.ts` (the blocking read and
its single waiter), `ready.ts` (the "ready?" gate before the first serve), and
`clock.ts` (the worker heartbeat that keeps a hidden tab running).

`hud.ts` holds the turn box and the round line, split out of `controller.ts` when
a fourth game pushed it past the line limit. Controller keeps `paint()` and
`startGame()`; `hud.ts` and `acts.ts` keep the text and the buttons.

**Hanoi's aid stops at legal and never reaches good.** `hanoi_moves` returns the
legal moves and says outright that they are not the good ones. The optimal move
is a four-line recursion, so a tool that returned it would leave the agent
nothing to do but transcribe and the race would demonstrate nothing. Don't
"improve" that tool into a solver. Five discs is load-bearing for the same
reason: below it the race is decided by clicking speed, at five it is decided by
knowing the recursion.

**Hanoi's clock is a timestamp, not a tally.** `elapsed()` subtracts
`startedAt` from now, so a throttled background tab can stutter the display and
never slow the race. Same lesson as Pong's worker heartbeat, solved by making
the value independent of how often anything runs.

**Pong bends two of those rules on purpose**, and neither should be "tidied up":
it renders to a canvas on its own wall-clock loop instead of being repainted by
`paint()`, and its tools skip `guard()` because a real-time game has no turns to
be out of. `pong_read` is also deliberately a *blocking* tool — it parks until
the ball comes at the agent. Read design.md's "Pong and the agent loop" before
changing anything in `pong/`; every constant in `PONG` is load-bearing and at
least three of them were bugs first.

**Pong's clock runs in a Web Worker whenever the tab is hidden**
(`pong/clock.ts`), and that is load-bearing, not a flourish: Chrome throttles
main-thread timers in a background tab to about one a second, which froze the
ball — so `pong_read` never had a shot to hand over and the agent's paddle stood
still all round. rAF still drives the visible case. Don't put the heartbeat back
on `setInterval`.

**The board refuses to be played by hand, and says so.** A click during the
agent's turn used to `return` silently; `refuseHandPlay()` now flashes the turn
box and leaves a rejected line in the rail, and `get_match` says the same in its
description. An agent whose client doesn't expose the tools falls back on
screenshot-and-click, and a silent swallow leaves both the agent and the room
with no idea why nothing is happening. Don't turn it back into a bare `return`.

**Every Pong response ends with `next_action`**, naming the call the agent should
make next. Without it the agent answers one read, writes its user a progress
report, and the rally ends with its paddle parked. Keep it on every response.

**In a Pong duel the agent serves.** `startRound` only arms the round;
`pong_ready` is what puts the ball in play, so checking in *is* the start signal
and there is no button (Space is the escape hatch for `?duo=1` and demos with no
agent attached). That call is also where the agent is told, in one piece, that it
is the blue paddle on the left; `you_are` then rides on every response. All of it
exists because an agent walked into a live rally not knowing it had a paddle.

**The ball waits for the agent to ask, not just to answer** (`holdForAgent()`).
Slow motion covers the whole round-trip: it starts when the shot turns toward the
agent, not when a read is answered. Without that, a shot could turn, arrive and
bounce entirely inside the gap between the agent's `pong_move` and its next
`pong_read` — nothing parked to wake, so the trigger looked broken. `loop.test.ts`
drives the full read/move loop at a sweep of latencies and is the regression test
for it; if you change the wake logic, run that file first.

**Pong's ball is slow on purpose.** `baseSpeed` 180 / `maxSpeed` 380 are not
playability numbers, they are round-trip numbers: from the wake line to the
agent's paddle is ~10 s of real time in slow motion, which is several model
round-trips. `actions.test.ts` has a test asserting that budget — if you tune a
speed and it goes red, the demo is what broke, not the test.

**Pong's paddle is keyboard-only, and that is not an oversight** — don't add
mouse or touch control back. An agent that misses the tools and falls back on
clicking and moving the mouse ends up dragging the *human's* paddle around, which
is what it looked like the one time it happened live. Keys are the human's
channel, tools are the agent's, and the separation is the point.

`tools/helpers.ts` has `toolDef`, `wrapText`, `guard`, and `NOT_TURN`.
`tools/registry.ts` builds the per-game tool map and runs the
`AbortController` that unregisters the previous game's tools on switch (the
third demo moment). `tools/core.ts` is the 4 tools that don't depend on the
active game (`get_match`, `list_games`, `switch_game`, `new_round`) — their
`run` must stay `async` and `await startGame(...)` (see design.md's Lifecycle
section for why: an un-awaited one lets a second switch race the first).

Unit tests (Vitest, jsdom environment) live next to the code they cover as
`*.test.ts`, and only exist for the `state.ts`/`actions.ts`/`query.ts` engine
layer of each game plus `metrics.ts`, `tools/helpers.ts`, and the root
`state.ts` — the parts that are pure logic with no DOM. `render.ts`,
`tools.ts`, `controller.ts`, `acts.ts`, `log.ts`, and `main.ts` are DOM glue
and aren't unit-tested; the manual checklist in `design.md` still covers
those. Engine tests reset `newBoard()`/`blank()` and the relevant `S` fields
in a `beforeEach` — the board and `S` are module-level singletons, not
recreated per test. Pong's engine is testable for the same reason: `step(dt)`
takes the elapsed time as an argument instead of reading a clock, so a test
drives it in slices exactly the way the render loop does.

`pong/loop.test.ts` is the exception to the one-mechanism-per-test rule, on
purpose: it drives the entire read → think → move → read cycle over thousands of
simulated ticks at a sweep of agent latencies. The bugs it exists to catch are
properties of the *sequence* — a shot nobody was awake for — and every one of
them passed the per-mechanism tests before it was found.

`controller.ts` is the orchestrator: `paint()` (repaints scoreboard, turn, acts)
and `startGame()` (starts/resets a game, registers its tools). `acts.ts` holds
the per-game action buttons, split out to keep both files under the ~200-line
guideline. **This is a deliberate import cycle**: every game's `render.ts` and
`tools.ts`, plus `tools/core.ts` and `acts.ts`, import `paint` or `startGame`
back from `controller.ts`. It works because `paint` and `startGame` are
`function` declarations (hoisted), never arrow functions assigned to `const` —
don't convert them, that would break the cycle with a `ReferenceError` at load
time.

## Workflow

This repo uses Spec-Driven Development, Kiro methodology. The spec lives in
`.kiro/specs/webmcp-arcade/` as three files in order: `requirements.md`
(what, in EARS format), `design.md` (how), and `tasks.md` (in what order).

Before writing code: read all three. If the change contradicts the spec, update
the spec first and say so in your message. When you finish a task, check it off
in `tasks.md`.

The project's live state lives in `docs/private/` (gitignored):
`agents.md`, `changelog.md`, and `memory.md`.
