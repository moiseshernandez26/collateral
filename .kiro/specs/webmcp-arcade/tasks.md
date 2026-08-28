# Tasks — Duel (WebMCP arcade)

Implementation order. Each task cites the requirements it satisfies. Check them
off as you finish and note what you learned in `docs/private/changelog.md`.

What's checked off is already in the working prototype.

---

## Phase 1 — Skeleton

- [x] 1.1 Vite + TypeScript project with header, arena, and call rail — _R12.1_
- [x] 1.2 State object `S` with `round` and `series` kept separate — _R5.10_
- [x] 1.3 Idempotent `paint()` that redraws everything from state — _R11.3_
- [x] 1.4 Tab system between the two games — _R2.4_

## Phase 2 — Minesweeper engine

- [x] 2.1 9×9 board, deferred seeding, safe first cell — _R5.1, R5.2_
- [x] 2.2 Opening with cascade on zeros — _R5.3_
- [x] 2.3 Mine claim: hit keeps the turn, miss passes it — _R5.5, R5.6_
- [x] 2.4 Stepping on a mine awards a point to the opponent — _R5.4_
- [x] 2.5 Rejections: repeated cell, out of bounds, claim during `fresh` — _R5.7, R5.8_
- [x] 2.6 Round end and verdict by round points — _R5.9_
- [x] 2.7 Classic solo mode with flags and loss — _R6.1 to R6.5_

## Phase 3 — Connect 4 engine

- [x] 3.1 7×6 board with gravity drop — _R7.1, R7.2_
- [x] 3.2 Four-in-a-row detection in all four directions — _R7.4_
- [x] 3.3 Tie on a full board — _R7.5_
- [x] 3.4 Verified puzzle generator, with fallback — _R8.1 to R8.8_

## Phase 4 — Deduction aids

- [x] 4.1 `ms_frontier` with `remaining` and `unknown` — _R9.1_
- [x] 4.2 `c4_analysis` with win, block, and traps — _R9.2_
- [ ] 4.3 Tune the descriptions against real agent play — _R9.4_

  Run ten games with the agent and note every bad move. The fix goes in the
  `description` text, not the logic. Record which wording failed.

## Phase 5 — WebMCP layer

- [x] 5.1 Registration of the four core tools — _R1.1, R1.3_
- [x] 5.2 Per-game registration with `AbortController` — _R2.1, R2.2_
- [x] 5.3 Turn guard only on write tools — _R4.2, R4.5_
- [x] 5.4 Availability detection and fallback to solo mode — _R3.1, R3.2_
- [x] 5.5 `?duo=1` to force duel mode without an agent — _R3.6_
- [x] 5.6 Ask the human to pick duel or solo when WebMCP is present, instead
      of assuming an agent is attached — _R3.7_
- [ ] 5.7 Review the `inputSchema`s against the inspector — _R1.4_

  Make sure every argument carries a type, a range in the description, and the
  right `required` list.

## Phase 6 — Presentation

- [x] 6.1 Contrast between closed and open cells — _R11.1_
- [x] 6.2 Call rail with distinguished rejections — _R10.1 to R10.4_
- [x] 6.3 Hide every trace of an opponent in solo mode — _R3.3, R3.4, R3.5_
- [ ] 6.4 Accessibility pass — _R11.5, R11.6_

  Go through both boards keyboard-only. Confirm visible focus on every cell and
  that `prefers-reduced-motion` turns off the animations.

- [ ] 6.5 Test at 360 px wide — _R11.4_

## Phase 7 — Demo-ready

- [ ] 7.1 Run the manual test checklist from `design.md`
- [ ] 7.2 Rehearse the three demo moments with the inspector open
- [ ] 7.3 Record the backup video

  Not optional. It's a feature behind a flag, and a demo that crashes costs more
  credibility than a smooth one earns.

- [ ] 7.4 Verify dependency licenses — _R12.4_

## Backlog

Ideas that fit later without redesigning anything:

- A third minigame that reuses the tools layer and the call rail
- Session metrics: calls per round, rejections, bad moves
- Export the match as JSON to replay it
- `exposedTo` to share tools with a guest origin — the one part of the standard
  still untried here
