export const RULES: Record<string, string> = {
  ms_duel: `Shared 9×9 board with 13 mines, turn-based. On your turn you make <b>one</b> move.
    <ul><li><b>Open</b> a safe cell: turn passes.</li>
    <li><b>Open</b> a mine: the point goes to the agent.</li>
    <li><b>Claim</b> a mine and get it right: 1 point and <b>you keep playing</b>.</li>
    <li><b>Claim</b> and miss: you lose the turn, no other penalty.</li></ul>
    Ends when all 13 mines are claimed or stepped on.`,
  ms_solo: `Classic Minesweeper, 9×9 with 13 mines.
    <ul><li>Tap to open a cell.</li>
    <li>Right-click, or flag mode, to mark a mine.</li>
    <li>The first cell is never a mine.</li>
    <li>You win by uncovering everything that isn't a mine.</li></ul>`,
  c4_duel: `6×5 board, turns alternate dropping a piece.
    <ul><li>Whoever lines up four horizontally, vertically, or diagonally wins.</li>
    <li>Columns range from 0 to 5.</li>
    <li>Full board with no line: a tie.</li></ul>`,
  c4_solo: `One-shot puzzle. The board appears with a position already set up.
    <ul><li>There is <b>one</b> column where your red piece makes four in a row.</li>
    <li>If you get it wrong, the piece doesn't stay: try again.</li>
    <li>Solving it moves you to the next puzzle.</li></ul>`,
  hanoi_duel: `A race, not a turn-based game. You each get your own tower of 5 discs
    and one clock runs for both. <b>The agent starts it</b> by calling
    <code>hanoi_ready</code>, so nobody gets a head start.
    <ul><li>Move the whole tower onto <b>peg 2</b>. Click a peg to pick up its top
    disc, click another to drop it.</li>
    <li>A disc may only rest on a <b>bigger</b> one.</li>
    <li><b>31 moves is optimal.</b> Fewer is impossible; more costs you time.</li>
    <li>The agent gets told which moves are <i>legal</i>, never which one is
    <i>good</i> — that part it has to work out, and every call costs it clock.</li></ul>`,
  hanoi_solo: `The classic puzzle, against the clock. One tower of 5 discs.
    <ul><li>Move the whole tower onto <b>peg 2</b>: click a peg to pick up its top
    disc, click another to drop it.</li>
    <li>A disc may only rest on a bigger one.</li>
    <li>The clock starts on your first move. <b>31 moves is optimal.</b></li>
    <li>Your best time is kept.</li></ul>`,
  pong_duel: `Real-time, not turn-based. You are the <b>red</b> paddle on the right,
    the agent the <b>blue</b> one on the left, playing only through its tools.
    First to 5 points. <b>The agent serves</b>, by calling <code>pong_ready</code> —
    which is also where it finds out which paddle is its own.
    <ul><li>Move with the <b>↑</b> / <b>↓</b> arrow keys, <b>Shift</b> for fine
    control. The mouse does nothing here, by design.</li>
    <li>It can't watch every frame, so <code>pong_read</code> waits until the ball
    turns toward it, then hands it the interception point.</li>
    <li><b>While it decides, the ball slows to a crawl</b> — that pause is a
    round-trip, made visible.</li></ul>`,
  pong_solo: `Keep the ball alive. It bounces off the top, bottom, and left walls;
    you defend the right.
    <ul><li>Move your paddle with the <b>↑</b> and <b>↓</b> arrow keys — hold <b>Shift</b>
    for fine control.</li>
    <li>Every return speeds the ball up a little.</li>
    <li>Miss it once and the run ends — your best run is kept.</li></ul>`,
};
