# Requirements — Duel (WebMCP arcade)

EARS format. Each criterion is independently verifiable.

Glossary: **agent** = the external browser agent that invokes tools.
**duel mode** = WebMCP is available and the agent is the opponent.
**solo mode** = no WebMCP, only the human plays.

---

## Requirement 1 — Tool registration

**Story:** As the person presenting the demo, I want the page to declare its
capabilities as real tools, so I can show that the agent isn't guessing anything.

### Criteria

1. THE SYSTEM SHALL register its tools via `document.modelContext.registerTool()`.
2. THE SYSTEM SHALL NOT use `navigator.modelContext` in any code path.
3. WHEN the page finishes loading THE SYSTEM SHALL register the four core tools
   before registering the active game's tools.
4. THE SYSTEM SHALL declare on each tool a `name`, a prose `description`, and an
   `inputSchema` with the types and ranges of each argument.
5. WHERE a tool does not mutate state THE SYSTEM SHALL mark it with
   `annotations.readOnlyHint = true`.
6. WHEN registration completes THE SYSTEM SHALL show the number of active tools in
   the header's status indicator.

## Requirement 2 — Dynamic per-game registration

**Story:** As the presenter, I want the tool list to change when the game switches,
so I can show the tool lifecycle live.

### Criteria

1. WHEN the user or the agent switches minigame THE SYSTEM SHALL unregister the
   previous game's tools by calling `abort()` on its `AbortController`.
2. WHEN the previous tools are unregistered THE SYSTEM SHALL register the new
   game's tools with a fresh `AbortController`.
3. THE SYSTEM SHALL keep the core tools registered for the entire session.
4. WHILE a game is active THE SYSTEM SHALL expose only that game's tools plus the
   core tools.

## Requirement 3 — Availability detection

**Story:** As anyone opening the app, I want it to work even without WebMCP, so I
don't run into a dead page.

### Criteria

1. IF `document.modelContext` does not exist or `registerTool` is not a function
   THEN THE SYSTEM SHALL enter solo mode.
2. IF registering a tool throws THEN THE SYSTEM SHALL enter solo mode and log the
   error to the console.
3. WHILE in solo mode THE SYSTEM SHALL hide the agent call rail.
4. WHILE in solo mode THE SYSTEM SHALL NOT show a two-player scoreboard, an
   opponent turn indicator, or any mention of an opponent.
5. WHILE in solo mode THE SYSTEM SHALL show a single-number scoreboard.
6. WHERE the URL contains `?duo=1` THE SYSTEM SHALL force duel mode even without
   WebMCP, for interface testing.
7. IF `document.modelContext` exists and `registerTool` is a function THEN THE
   SYSTEM SHALL ask the human to choose duel mode or solo mode before
   registering any game tools, since the API being present does not mean an
   agent is actually attached to call it.

## Requirement 4 — Turns

**Story:** As the presenter, I want the page to enforce the rules, so I can show
that the agent can't cheat.

### Criteria

1. THE SYSTEM SHALL keep a single turn with two possible values: human or agent.
2. IF an action tool is invoked when it is not the agent's turn THEN THE SYSTEM
   SHALL return `{ ok:false, reason:"it's not your turn..." }` without changing state.
3. IF an action tool is invoked with the round already over THEN THE SYSTEM SHALL
   reject it without changing state.
4. WHILE it is the agent's turn THE SYSTEM SHALL ignore the human's clicks on the
   board.
5. THE SYSTEM SHALL always allow read-only tools, regardless of whose turn it is.

## Requirement 5 — Minesweeper duel

**Story:** As a player, I want a competitive turn-based minesweeper, so the classic
game has an opponent.

### Criteria

1. THE SYSTEM SHALL generate a 9×9 board with 13 mines.
2. WHEN the first cell of the round is opened THE SYSTEM SHALL place the mines
   excluding that cell and its eight neighbors.
3. WHEN a player opens a mine-free cell THE SYSTEM SHALL reveal it, cascade the
   opening if its count is zero, and pass the turn.
4. WHEN a player opens a mined cell THE SYSTEM SHALL award a round point to the
   opponent, mark the mine as stepped on, and pass the turn.
5. WHEN a player claims a cell that does have a mine THE SYSTEM SHALL award them a
   round point and let them keep their turn.
6. WHEN a player claims a mine-free cell THE SYSTEM SHALL pass the turn without
   awarding or deducting points.
7. IF a claim is attempted before the board has been generated THEN THE SYSTEM
   SHALL reject the move.
8. IF opening or claiming an already-open or already-claimed cell is attempted
   THEN THE SYSTEM SHALL reject the move.
9. WHEN all 13 mines are claimed or stepped on THE SYSTEM SHALL end the round and
   award it to whoever has more round points.
10. THE SYSTEM SHALL track round points and rounds won in separate counters.

## Requirement 6 — Minesweeper in solo mode

### Criteria

1. WHILE in solo mode THE SYSTEM SHALL apply the classic rules: open, flag, lose
   on opening a mine.
2. WHEN the player opens a mine THE SYSTEM SHALL end the game and reveal the
   remaining mines.
3. WHEN every mine-free cell is open THE SYSTEM SHALL declare victory and increment
   the games-won counter.
4. THE SYSTEM SHALL allow flagging and unflagging via right-click or a toggleable
   flag mode.
5. THE SYSTEM SHALL NOT allow opening a flagged cell.

## Requirement 7 — Connect 4

### Criteria

1. THE SYSTEM SHALL use a 7-column by 6-row board.
2. WHEN a player drops a piece THE SYSTEM SHALL place it in that column's lowest
   free row.
3. IF the column is full or outside the 0–6 range THEN THE SYSTEM SHALL reject the
   move and explain why.
4. WHEN a move forms four in a row horizontally, vertically, or diagonally THE
   SYSTEM SHALL end the round, highlight the line, and award the round to that
   player.
5. IF the board fills up with no line THEN THE SYSTEM SHALL declare a tie without
   awarding the round to anyone.

## Requirement 8 — Connect 4 in solo mode

### Criteria

1. WHILE in solo mode THE SYSTEM SHALL present a one-shot puzzle instead of the
   two-player game.
2. THE SYSTEM SHALL generate the puzzle position so that at least one column exists
   where the player's piece immediately makes four in a row.
3. THE SYSTEM SHALL verify the puzzle is solvable before showing it and discard the
   position if it isn't.
4. THE SYSTEM SHALL generate valid positions under gravity: in each column the
   occupied cells are contiguous from the bottom.
5. THE SYSTEM SHALL NOT generate positions that already contain four in a row.
6. IF the player drops in a column that doesn't win THEN THE SYSTEM SHALL pull the
   piece back and allow another attempt.
7. WHEN the player solves the puzzle THE SYSTEM SHALL increment the puzzles-solved
   counter and offer a new one.
8. IF the generator finds no valid position within 800 attempts THEN THE SYSTEM
   SHALL use a fixed, solvable fallback position.

## Requirement 9 — Deduction aids for the agent

**Story:** As the presenter, I want the agent to play well, because an agent that
plays poorly discredits the technology instead of showcasing it.

### Criteria

1. THE SYSTEM SHALL expose a tool that returns, for every open numbered cell, how
   many mines are still missing around it and which closed cells surround it.
2. THE SYSTEM SHALL expose a tool that returns, for Connect 4, the columns where the
   agent wins immediately, the ones it must block, and the ones that hand over the
   win.
3. THE SYSTEM SHALL compute these aids in deterministic JavaScript, without
   consulting any model.
4. THE SYSTEM SHALL describe in each tool's text how to interpret its output.

## Requirement 10 — Call rail

### Criteria

1. WHEN a tool executes THE SYSTEM SHALL append an entry with name, arguments, a
   summary of the response, and a timestamp.
2. THE SYSTEM SHALL show the most recent entry at the top.
3. WHERE the response has `ok:false` THE SYSTEM SHALL visually distinguish the
   entry from successful ones.
4. THE SYSTEM SHALL truncate long responses so each entry fits in a few lines.

## Requirement 11 — Interface

### Criteria

1. THE SYSTEM SHALL clearly distinguish closed cells from open ones by color and
   relief, without relying on subtle tone differences.
2. THE SYSTEM SHALL distinguish the human's pieces from the agent's by color.
3. THE SYSTEM SHALL show whose turn it is and the current score at all times.
4. THE SYSTEM SHALL work on screens 360 px wide and up.
5. THE SYSTEM SHALL show visible focus on every keyboard-operable control.
6. WHERE the operating system requests reduced motion THE SYSTEM SHALL suppress
   animations.

## Requirement 12 — Delivery

### Criteria

1. THE SYSTEM SHALL be a Vite + TypeScript project built to a static `dist/`
   bundle, split into modules of roughly 200 lines or fewer each.
2. THE SYSTEM SHALL work even if CDN dependencies fail to load.
3. THE SYSTEM SHALL NOT make network requests to any first-party or third-party
   service during play.
4. THE SYSTEM SHALL use only MIT-licensed dependencies.
