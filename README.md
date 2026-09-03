# Duel

A minigame arcade in the browser where the opponent is an
**external agent** — a browser AI agent, an MCP inspector, whatever's on the
other end — playing by calling [WebMCP](https://github.com/webmachinelearning/webmcp)
tools registered with `document.modelContext.registerTool()`. Four games:
a minesweeper duel, Connect 4, a real-time Pong, and a Towers of Hanoi race
against the clock.

Pong is the interesting one. A tool call is request/response and an agent
round-trip takes seconds — longer than the ball takes to cross the court. So
instead of the agent polling the ball, `pong_read` *blocks* until the ball turns
toward the agent and then hands back the interception point, and the ball crawls
until the agent answers. The agent's ordinary call-and-respond rhythm becomes
the rally. You play with the arrow keys and never the mouse, so an agent that
reaches for the pointer instead of the tools can't end up playing your paddle.
See `.kiro/specs/webmcp-arcade/design.md`.

This is an internal demo built to teach WebMCP at work. It's not a product —
see `CLAUDE.md` for what that means for how this repo is built and why some
choices favor demo clarity over engineering polish.

## Try it

**Live:** <https://moiseshernandez26.github.io/collateral/>

**Or locally:**

```
npm install
npm run dev          # http://localhost:5173
```

Chrome treats `http://localhost` as a secure context, so WebMCP works over plain
HTTP in dev — no certificate warning.

## Setup

WebMCP is still behind a flag:

1. **Chrome 149 or later**
2. `chrome://flags/#enable-webmcp-testing` → **Enabled**
3. **Restart Chrome**

You also need something that will actually *call* the tools: a browser AI agent
that speaks WebMCP, or the **Model Context Tool Inspector** extension to drive
them by hand.

The flag is the step people miss. Without it `document.modelContext` doesn't
exist and the page falls back to single-player — no error, it just quietly has
no opponent.

## Using it

**1. Open it and read the pill** in the top left. It separates the two things
that look identical from across a room:

| Pill | Means |
| --- | --- |
| `8 tools · waiting for agent` | Tools are registered. **Nothing has called them yet.** |
| `8 tools active` | An agent has actually called one. You're live. |
| `no webmcp · single player` | The flag is off, or the browser is too old. |

Tools go up the moment the page loads, so an agent attaching to the tab finds
the list already there.

**2. Attach your agent to _this tab_.** This is the most common failure: the
agent is running, but pointed somewhere else, and the rail stays empty.

**3. Tell it what to play.** The right-hand rail has a **"Say this to your
agent"** block with a **copy** button, and the phrase changes per game. Hovering
a game tab shows a one-line version of the same thing. Once calls start
arriving the block folds itself away so the log gets the room — click its header
to bring it back.

**4. Watch the rail.** Every call lands there with its arguments and its
response. That rail is what turns a game into a WebMCP demo.

**5. Switch games** — click a tab, or ask the agent to call `switch_game`. An
`AbortController` unregisters the previous game's tools and registers the new
one's, so the tool list transforms live.

## Playing each game

| Game | You | The agent |
| --- | --- | --- |
| **Minesweeper** | Click to open a cell. "Claim mine", then click, to claim one. | `ms_frontier` → `ms_reveal` / `ms_claim` |
| **Connect 4** | Click a column | `c4_analysis` → `c4_drop` |
| **Pong** | **↑ / ↓** arrow keys, **Shift** for fine control. The mouse does nothing, by design. | `pong_ready`, then loop `pong_read` → `pong_move` |
| **Hanoi** | Click a peg to pick up its top disc, click another to drop it. All 5 onto **peg 2**. | `hanoi_ready` starts the clock, then `hanoi_move` |

**Pong is the one to watch.** When the ball turns toward the agent the page
slows it to 12% speed and the turn box reads *"ball slowed while the tool call
is out"*. That pause is one round-trip to your agent, made visible.

**Hanoi is a race**, not turns: both towers run at once against a single clock.
The agent is told which moves are *legal*, never which one is *good* — 31 moves
is optimal, and every call costs it clock.

## Without an agent

- **Solo:** the **mode dropdown** in the top bar → *Solo*. This unregisters
  every tool, hides the call rail, and switches all four games to real
  single-player rules. Switch back any time.
- **The duel interface with nothing attached:** add `?duo=1` to the URL. In Pong
  and Hanoi, press **Space** to start a round by hand.

## Troubleshooting

**The rail is empty and the pill says `waiting for agent`.** The registering
half worked; the calling half is what's missing. Check the agent is attached to
*this* tab and picked up the tool list after the page loaded. A good probe: ask
it *"What tools does this page offer? List them."*

**The agent is screenshotting and clicking instead of calling tools.** Its
client probably isn't surfacing them. The board refuses hand-play on the agent's
turn and says so out loud in the rail. Tell it: *"Use only this page's WebMCP
tools. Don't click or screenshot."*

**Testing from another device on your LAN.** Chrome does *not* extend the
localhost exemption to a bare `192.168.x.x` address, so over plain HTTP WebMCP
silently disappears and the app drops to solo. Run
`HTTPS=1 npm run dev -- --host` and accept the self-signed certificate once per
device (see `CLAUDE.md` → "How to test").

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | dev server with HMR |
| `npm run build` | `tsc` strict typecheck, then production build to `dist/` |
| `npm run preview` | serves the built `dist/` |
| `npm run test` | runs the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Project layout

- `index.html`, `src/` — the app. Vite + vanilla TypeScript, no backend,
  no framework. Every module stays under ~200 lines by design.
- `CLAUDE.md` — the real guide: the demo's goals, hard constraints, and the
  reasoning behind how the code is organized. Read this before changing
  anything non-trivial.
- `.kiro/specs/webmcp-arcade/` — the spec this was built from
  (`requirements.md`, `design.md`, `tasks.md`), Kiro-style spec-driven
  development. Update it alongside the code, not after.
- `docs/INDEX.md` — a short glossary and map of the above.

## Stack

Vite, TypeScript (strict), Vitest + jsdom for unit tests. anime.js loads from
a CDN with a runtime guard — not an npm dependency.

## Licence

This project is **MIT** — see [`LICENSE`](LICENSE).

Its dependencies are a separate question, and the answer differs for what ships
and what only builds. What the browser loads: anime.js under MIT, and the Anton,
Chivo and DM Mono fonts under the SIL Open Font Licence 1.1. No `node_modules`
code is bundled. The build and test toolchain is 83 packages, mostly MIT with
some Apache-2.0, BSD, ISC, CC0, MPL-2.0 and BlueOak — all OSI-approved, and none
of it ships.
