# Duel — index

Turn-based minigame arcade where the opponent is an external agent playing by
calling [[WebMCP]] tools. Internal demo, not a product.

## Start here

- [[CLAUDE]] — goal, hard constraints, and working rules
- [[requirements]] — what it must do, in EARS format
- [[design]] — how it's built
- [[tasks]] — in what order, with what's left

## Map

```
CLAUDE.md
.kiro/specs/webmcp-arcade/
    requirements.md    →  EARS, 14 requirements
    design.md          →  architecture, contracts, generator, the Pong loop
    tasks.md           →  7 phases + backlog
docs/
    INDEX.md           →  this file
    private/           →  gitignored, live state
        agents.md
        changelog.md
        memory.md
index.html             →  Vite entry point
src/                   →  the app, split by module (see CLAUDE.md architecture section)
```

## Concepts

- **WebMCP** — the page registers tools with `document.modelContext.registerTool()`
  and a browser agent discovers and invokes them. `navigator.modelContext` was
  deprecated in Chrome 150.
- **Duel mode** — the external agent is the opponent and plays turn by turn.
  Entered automatically when WebMCP is available, since the tools have to be
  registered before an agent lists them — availability alone doesn't imply an agent is
  attached.
- **Solo mode** — a single player, no opponent, no two-player scoreboard.
  Reached automatically with no WebMCP, or by picking "Solo" from the mode
  dropdown in the top bar, which unregisters every tool on the way.
- **Deduction aids** — `ms_frontier`, `c4_analysis`, Pong's `intercept_y` and
  Hanoi's `hanoi_moves`, which hand the agent the constraints already worked
  out. This is the real work of the project.
- **The race** — in Hanoi both sides solve their own tower at once against one
  clock. It is where the cost of an agent's move, one round-trip each, becomes
  something the room can watch.
- **The agent loop** — Pong's `pong_read` blocks until the ball comes at the
  agent, so a request/response tool can drive a continuous game. The ball slows
  while the agent decides.
- **The ready gate** — a Pong duel doesn't serve until the human presses "Start
  rally". That pause is when the agent calls `pong_ready` and is told which
  paddle is its own; the modal shows the room that it checked in.
- **The three moments** — the page announces itself, the agent plays in view, the
  tools rotate when the game switches.
