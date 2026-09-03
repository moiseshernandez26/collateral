# Duel

A turn-based minigame arcade in the browser where the opponent is an
**external agent** — a browser AI agent, an MCP inspector, whatever's on the
other end — playing by calling [WebMCP](https://github.com/webmachinelearning/webmcp)
tools registered with `document.modelContext.registerTool()`. Four games:
a minesweeper duel, Connect 4, a real-time Pong, and a Towers of Hanoi race
against the clock.

Pong is the interesting one. A tool call is request/response and an agent
round-trip takes seconds, which is longer than the ball takes to cross the
court — so instead of the agent polling the ball, `pong_read` blocks until the
ball turns toward the agent and then hands back the interception point, and the
ball crawls until the agent answers. The agent's ordinary call-and-respond
rhythm becomes the rally. You play it with the ↑ / ↓ arrow keys — deliberately
not with the mouse, so an agent that reaches for the pointer instead of the tools
can't end up playing your paddle. A duel round waits behind a "ready?" prompt
until you start it, which is when the agent calls `pong_ready` and gets told
which paddle is its own. See `.kiro/specs/webmcp-arcade/design.md`.

This is an internal demo built to teach WebMCP at work. It's not a product —
see `CLAUDE.md` for what that means for how this repo is built and why some
choices favor demo clarity over engineering polish.

## Quick start

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. With no WebMCP-capable browser, it drops
straight into single-player. With WebMCP available it registers its tools and
goes into duel mode right away, so an agent attaching to the tab finds the tool
list already there. The API being present still doesn't mean an agent is
actually listening — the pill in the bar says `waiting for agent` until a call
arrives — and the **mode dropdown** in the top bar switches to solo at any
time, which takes every tool back off the page.

## Playing against an agent

You need:

- Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
- Something that will actually call the tools: the **Model Context Tool
  Inspector** extension (to drive tools by hand) or a real agent that speaks
  WebMCP.

Without either of those, `document.modelContext` may still exist but nothing
will call your tools — switch the mode dropdown to solo, or test the duel
*interface* without a live agent via `http://localhost:5173/?duo=1`.

Testing from another device on your LAN needs HTTPS, since Chrome only treats
plain HTTP as a secure context on `localhost` — run `HTTPS=1 npm run dev -- --host`
for a self-signed certificate (see `CLAUDE.md` → "How to test" for the caveat).

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
