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
   SYSTEM SHALL register the core tools and enter duel mode on load, without
   asking the human first. (Superseded the mode-picker modal: the API being
   present still does not mean an agent is attached, but gating registration on
   a click meant an agent listing the page's tools on attach found none.)
8. WHERE WebMCP is available THE SYSTEM SHALL offer a mode control in the top
   bar for switching between duel and solo at any time.
9. WHEN the human switches to solo mode THE SYSTEM SHALL unregister every
   registered tool, and WHEN they switch back to duel THE SYSTEM SHALL
   register them again.
10. WHILE the human is choosing between the two modes THE SYSTEM MAY name the
    agent in the mode control itself; criterion 4 governs the game interface.
11. WHERE the viewport is at least 660 CSS pixels wide THE SYSTEM SHALL keep the
    whole interface within the viewport, scrolling the board pane and the call
    rail independently rather than the page.

## Requirement 4 — Turns

**Story:** As the presenter, I want the page to enforce the rules, so I can show
that the agent can't cheat.

### Criteria

1. THE SYSTEM SHALL keep a single turn with two possible values: human or agent.
2. IF an action tool is invoked when it is not the agent's turn THEN THE SYSTEM
   SHALL return `{ ok:false, reason:"it's not your turn..." }` without changing state.
3. IF an action tool is invoked with the round already over THEN THE SYSTEM SHALL
   reject it without changing state.
4. WHILE it is the agent's turn THE SYSTEM SHALL refuse clicks on the board, and
   SHALL say so on screen and in the call rail rather than ignoring them
   silently. An agent playing by screenshot-and-click has to be told that the
   click did nothing, or it just screenshots again and the room watches a game
   go nowhere.
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

1. THE SYSTEM SHALL use a 6-column by 5-row board.
2. WHEN a player drops a piece THE SYSTEM SHALL place it in that column's lowest
   free row.
3. IF the column is full or outside the 0–5 range THEN THE SYSTEM SHALL reject the
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
5. THE SYSTEM SHALL expose a tool that returns, for Pong, the y coordinate at which
   the ball will reach the agent's paddle, with wall bounces already resolved.

## Requirement 13 — Session metrics

**Story:** As the presenter, I want a running tally of how the agent is playing, so
I can talk about quality during the demo.

### Criteria

1. THE SYSTEM SHALL count, per round and per match, how many agent tool calls were
   made, how many were rejected (`ok:false`), and how many succeeded but cost the
   agent the point or the cell (a wrong claim or an opened mine).
2. THE SYSTEM SHALL reset the per-round count on every new round and the per-match
   counts on every fresh match.
3. THE SYSTEM SHALL show the same call total in the rail header and in the metrics
   line, so the two can never disagree.

## Requirement 14 — Pong

**Story:** As the presenter, I want one minigame that is not turn-based, so the room
sees that WebMCP is not limited to games that politely wait for the agent.

### Criteria

1. THE SYSTEM SHALL simulate the ball continuously from wall-clock time, and SHALL
   keep simulating **at full speed** while the tab is hidden, since the agent
   driving it is normally in another window. A clock the browser throttles in a
   background tab does not satisfy this.
2. THE SYSTEM SHALL prevent the ball from passing through a paddle at any frame
   rate, by advancing the simulation in steps no larger than the ball's radius.
3. WHEN the agent calls the read tool THE SYSTEM SHALL NOT answer until the ball is
   travelling toward the agent's paddle, and SHALL then return the interception
   point.
4. WHILE a shot belongs to the agent — from the moment it turns toward the agent
   until the agent has moved — THE SYSTEM SHALL slow the ball, so that a whole
   agent round-trip fits inside a rally, including the part where the agent is on
   its way back to asking. Slowing only from the answer leaves shots that arrive
   inside the gap between a move and the next read, and those look like the wake
   never fired.
5. THE SYSTEM SHALL hand any one approach to the agent at most once, so that a
   read/move loop cannot spin against a single shot.
6. IF the agent never moves after being handed an approach, or never asks at all,
   THEN THE SYSTEM SHALL return to full speed after a bounded wait and SHALL NOT
   re-slow the same shot, rather than staying slowed forever.
7. IF nothing comes at the agent within a bounded wait THEN THE SYSTEM SHALL answer
   the read with a timeout event rather than leaving the call hanging.
8. WHEN the round ends or the game is switched away THE SYSTEM SHALL settle any
   read still waiting.
9. THE SYSTEM SHALL reject a paddle move made in single player or after the round is
   over, and SHALL clamp an out-of-range coordinate instead of rejecting it.
10. WHILE in single player THE SYSTEM SHALL bounce the ball off the agent's edge as
    a wall and end the run when the player misses, recording the best run.
11. THE SYSTEM SHALL move the player's paddle with the arrow keys only, at a speed
    proportional to how long the key is held, and SHALL NOT move it in response to
    the pointer — an agent that drives the page with the mouse instead of the tools
    would otherwise be playing the human's paddle.
12. WHEN the window loses focus THE SYSTEM SHALL treat every held key as released,
    so the paddle does not keep gliding on the keyup that never arrives.
13. WHILE in a duel THE SYSTEM SHALL NOT serve the first ball of a round until the
    agent checks in with the briefing tool, and SHALL say on screen that the round
    is waiting on it. Checking in is the start signal; there is no button.
14. THE SYSTEM SHALL offer a briefing tool that states which paddle is the agent's,
    that only its move tool moves it, and how the read/move loop runs; and WHEN the
    agent calls it THE SYSTEM SHALL show on screen that the agent has checked in
    and serve the first ball.
15. WHILE a round is waiting to be started THE SYSTEM SHALL answer a read with a
    distinct event naming that reason, rather than leaving it parked for its full
    timeout.
16. WHEN the round is served THE SYSTEM SHALL wake a read that was already parked,
    so the agent does not miss the first shot.
17. THE SYSTEM SHALL end every Pong tool response with the next call the agent
    should make, so that an agent which stops to report between shots is the
    exception rather than the default.

## Requirement 15 — Towers of Hanoi

**Story:** As the presenter, I want a race against the clock, so the room sees
what an agent's real cost is — a round-trip per move — and what it buys, which
is knowing the algorithm.

### Criteria

1. THE SYSTEM SHALL give each side its own tower of 5 discs on peg 0 of 3, to be
   moved onto the last peg. 31 moves is optimal.
2. THE SYSTEM SHALL allow a disc to rest only on a bigger disc, and SHALL reject
   any other move with a reason, without counting it as a move.
3. THE SYSTEM SHALL have no turns: both sides move their own tower whenever they
   like, against one shared clock.
4. WHILE in a duel THE SYSTEM SHALL NOT let either side move before the agent has
   started the race with the ready tool, so neither gets a head start.
5. WHEN the race starts THE SYSTEM SHALL start one clock for both sides at the
   same instant.
6. WHEN a side completes its tower THE SYSTEM SHALL end the round, award it to
   them, and stop the other side where it stands.
7. THE SYSTEM SHALL measure elapsed time from timestamps rather than by counting
   ticks, so a throttled background tab cannot slow the clock.
8. THE SYSTEM SHALL expose the moves that are legal from the current position,
   and SHALL NOT expose which move is optimal — the recursion is the puzzle, and
   a tool that returned it would leave nothing to demonstrate.
9. THE SYSTEM SHALL tell each side how many moves the other has made, since both
   towers are on screen anyway and knowing you are behind is part of a race.
10. WHILE in solo mode THE SYSTEM SHALL start the clock on the player's first
    move, keep the best time, and mention no opponent anywhere.

## Requirement 10 — Call rail

### Criteria

1. WHEN a tool executes THE SYSTEM SHALL append an entry with name, arguments, a
   summary of the response, and a timestamp.
2. THE SYSTEM SHALL show the most recent entry at the top.
3. WHERE the response has `ok:false` THE SYSTEM SHALL visually distinguish the
   entry from successful ones.
4. THE SYSTEM SHALL truncate long responses so each entry fits in a few lines.
5. WHILE tools are registered and no call has ever arrived THE SYSTEM SHALL say so
   distinctly, rather than showing only that the tools are registered. Registering
   tools and having an agent that calls them are different facts, and the API
   offers no way to detect the second.
6. WHEN the registered tool list changes THE SYSTEM SHALL log the list the browser
   actually holds, so that an empty rail distinguishes "nothing registered" from
   "nothing is calling".
7. THE SYSTEM SHALL take the tool count it reports from the browser, not from its
   own record of what it asked to register.

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
4. THE SYSTEM SHALL load only permissively licensed third-party code and assets
   in the browser: today anime.js under MIT, and the Anton, Chivo and DM Mono
   fonts under the SIL Open Font Licence 1.1. No `node_modules` code SHALL reach
   the bundle.
5. THE SYSTEM's build and test toolchain MAY use any OSI-approved licence, since
   none of it is distributed — today that includes Apache-2.0, BSD, ISC, CC0,
   MPL-2.0 and BlueOak alongside MIT.
