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
  bs_duel: `6×6 waters each, turns alternate. One ship of 3 and two of 2 per side,
    placed at random and never touching — not even at a corner.
    <ul><li>Fire into <b>enemy waters</b> on the left. A <b>hit fires again</b>;
    a miss passes the turn.</li>
    <li><b>Neither side can see the other's fleet.</b> The agent has no tool that
    would tell it — only what its own shots have revealed.</li>
    <li><code>bs_targets</code> hands it the deduction: how many ways the ships
    left afloat still fit over each cell.</li>
    <li>Press <b>"Show agent's map"</b> to draw that same deduction over your own
    waters and watch whether it takes the shot it was pointed at.</li></ul>`,
  bs_solo: `One hidden fleet in 6×6 waters: a ship of 3 and two of 2, never touching.
    <ul><li>Sink all seven cells in as few shots as you can.</li>
    <li>A miss costs you nothing but a shot — there is no one to lose the turn to.</li>
    <li>Your best sweep is kept.</li></ul>`,
  pong_duel: `Real-time, not turn-based. You are the <b>red</b> paddle on the right,
    the agent is the <b>blue</b> one on the left. First to 5 points wins the round.
    <b>The agent serves.</b> Nothing moves until it calls <code>pong_ready</code>,
    which is also where it finds out which paddle is its own.
    <ul><li>Move your paddle with the <b>↑</b> and <b>↓</b> arrow keys — hold <b>Shift</b>
    for fine control. The mouse does nothing here, by design.</li>
    <li>The agent plays only through its tools; it never touches the page.</li>
    <li>The agent can't watch every frame, so <code>pong_read</code> waits until the
    ball turns toward it and then hands it the exact interception point.</li>
    <li><b>While the agent decides, the ball slows to a crawl</b> — that pause is
    a round-trip to the agent, made visible.</li></ul>`,
  pong_solo: `Keep the ball alive. It bounces off the top, bottom, and left walls;
    you defend the right.
    <ul><li>Move your paddle with the <b>↑</b> and <b>↓</b> arrow keys — hold <b>Shift</b>
    for fine control.</li>
    <li>Every return speeds the ball up a little.</li>
    <li>Miss it once and the run ends — your best run is kept.</li></ul>`,
};
