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
    requirements.md    →  EARS, 12 requirements
    design.md          →  architecture, contracts, generator
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
  Reached when WebMCP is available *and* the human picks "play vs agent" at
  the mode picker on load — availability alone doesn't imply an agent is
  attached.
- **Solo mode** — a single player, no opponent, no two-player scoreboard.
  Reached automatically with no WebMCP, or by choosing "play solo" at the
  picker when WebMCP is available.
- **Deduction aids** — `ms_frontier` and `c4_analysis`, which hand the agent the
  constraints already solved. This is the real work of the project.
- **The three moments** — the page announces itself, the agent plays in view, the
  tools rotate when the game switches.
