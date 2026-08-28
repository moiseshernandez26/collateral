export const RULES: Record<string, string> = {
  ms_duel: `Shared 9×9 board with 10 mines, turn-based. On your turn you make <b>one</b> move.
    <ul><li><b>Open</b> a safe cell: turn passes.</li>
    <li><b>Open</b> a mine: the point goes to the agent.</li>
    <li><b>Claim</b> a mine and get it right: 1 point and <b>you keep playing</b>.</li>
    <li><b>Claim</b> and miss: you lose the turn, no other penalty.</li></ul>
    Ends when all 10 mines are claimed or stepped on.`,
  ms_solo: `Classic Minesweeper, 9×9 with 10 mines.
    <ul><li>Tap to open a cell.</li>
    <li>Right-click, or flag mode, to mark a mine.</li>
    <li>The first cell is never a mine.</li>
    <li>You win by uncovering everything that isn't a mine.</li></ul>`,
  c4_duel: `7×6 board, turns alternate dropping a piece.
    <ul><li>Whoever lines up four horizontally, vertically, or diagonally wins.</li>
    <li>Columns range from 0 to 6.</li>
    <li>Full board with no line: a tie.</li></ul>`,
  c4_solo: `One-shot puzzle. The board appears with a position already set up.
    <ul><li>There is <b>one</b> column where your red piece makes four in a row.</li>
    <li>If you get it wrong, the piece doesn't stay: try again.</li>
    <li>Solving it moves you to the next puzzle.</li></ul>`,
};
