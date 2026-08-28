# Duel

A turn-based minigame arcade in the browser where the opponent is an
**external agent** — a browser AI agent, an MCP inspector, whatever's on the
other end — playing by calling [WebMCP](https://github.com/webmachinelearning/webmcp)
tools registered with `document.modelContext.registerTool()`. Two games:
a minesweeper duel and Connect 4.

This is an internal demo built to teach WebMCP at work. It's not a product —
see `CLAUDE.md` for what that means for how this repo is built and why some
choices favor demo clarity over engineering polish.

## Quick start

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. With no WebMCP-capable browser or agent
attached, it drops straight into single-player. With WebMCP available, it
asks you to pick "play vs agent" or "play solo" before doing anything else —
the API being present doesn't mean an agent is actually listening.

## Playing against an agent

You need:

- Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
- Something that will actually call the tools: the **Model Context Tool
  Inspector** extension (to drive tools by hand) or a real agent that speaks
  WebMCP.

Without either of those, `document.modelContext` may still exist but nothing
will call your tools — pick "play solo" at the prompt, or test the duel
*interface* without a live agent via `http://localhost:5173/?duo=1`.

Testing from another device on your LAN needs HTTPS — `npm run dev -- --host`
serves a self-signed cert for exactly that (see `CLAUDE.md` → "How to test"
for why and the one-time certificate-warning caveat).

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
a CDN with a runtime guard — not an npm dependency. Every dependency is
MIT-licensed.
