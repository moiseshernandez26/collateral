# CLAUDE.md — Duel

Guide for any agent working in this repo. Read it in full before touching code.

## What this is

A minigame arcade in the browser where the opponent is an **external agent**
playing by calling WebMCP tools. Three games: a minesweeper duel, Connect 4,
and Pong. The first two are turn-based; Pong is real-time and exists to show
that WebMCP isn't limited to games that wait politely for the agent.

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
- **Testing over a LAN IP needs HTTPS.** `document.modelContext` is gated to
  secure contexts; Chrome trusts `localhost`/`127.0.0.1` over plain HTTP but not
  a bare `192.168.x.x` address. `vite.config.ts` adds
  `@vitejs/plugin-basic-ssl` for exactly this: `npm run dev -- --host` now
  serves `https://<your-ip>:5173` (self-signed), so WebMCP works from other
  devices on the LAN too. The browser will show a certificate warning on first
  visit per device — click through it once ("Advanced" → "Proceed"), it's
  expected for a self-signed cert. Plain `http://localhost:5173` still works
  exactly as before.
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

**Pong bends two of those rules on purpose**, and neither should be "tidied up":
it renders to a canvas on its own wall-clock loop instead of being repainted by
`paint()`, and its tools skip `guard()` because a real-time game has no turns to
be out of. `pong_read` is also deliberately a *blocking* tool — it parks until
the ball comes at the agent. Read design.md's "Pong and the agent loop" before
changing anything in `pong/`; every constant in `PONG` is load-bearing and at
least three of them were bugs first.

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
