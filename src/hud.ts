// The strip above the board: whose turn it is, and the round line under it.
// Split out of controller.ts when a fourth game pushed that file past the
// ~200-line guideline — controller keeps paint() and startGame(), this keeps
// the text.
import { S } from './state';
import { MS, taken, flags, claimMode, flagMode } from './minesweeper/state';
import { msg as c4Msg } from './connect4/state';
import { PONG, rallies, thinking, awaitingStart } from './pong/state';
import { OPTIMAL, moves as hanoiMoves, startedAt as hanoiStarted, fmt, plural } from './hanoi/state';

export function paintHud(): void {
  paintTurn();
  paintRoundLine();
}

function paintTurn(): void {
  const t = document.getElementById('turn')!;
  const who = t.querySelector('.who')!;
  const hint = document.getElementById('turnHint')!;

  if (S.over) {
    t.className = 'turn over';
    who.textContent = S.verdict;
    hint.textContent = S.duel
      ? 'tap "New round"'
      : S.game === 'ms'
        ? 'tap "New game"'
        : S.game === 'c4'
          ? 'tap "Next puzzle"'
          : S.game === 'hanoi'
            ? 'tap "New tower"'
            : 'tap "New run"';
    return;
  }
  // Pong has no turns at all — both paddles are live the whole time — so the
  // turn box reports what the ball is doing instead of whose move it is.
  if (S.game === 'pong') {
    if (S.duel && awaitingStart) {
      t.className = 'turn h';
      who.textContent = 'Ready?';
      hint.textContent = 'ball parked · waiting on pong_ready';
      return;
    }
    t.className = 'turn ' + (S.duel && thinking ? 'a' : 'h');
    who.textContent = S.duel ? (thinking ? 'Agent deciding' : 'Rally') : 'Pong';
    hint.textContent = S.duel
      ? thinking
        ? 'ball slowed while the tool call is out'
        : 'move with ↑ / ↓'
      : 'keep it alive · ↑ / ↓';
    return;
  }
  // Hanoi has no turns either: both sides work their own tower at once against
  // one clock, so the box reports the race rather than whose move it is.
  if (S.game === 'hanoi') {
    const waiting = S.duel && hanoiStarted === null;
    t.className = 'turn ' + (waiting ? 'a' : 'h');
    who.textContent = waiting ? 'On your marks' : S.duel ? 'Race' : 'Hanoi';
    hint.textContent = waiting
      ? 'the clock starts when the agent calls hanoi_ready'
      : S.duel
        ? 'both towers at once · first one finished wins'
        : hanoiStarted === null
          ? 'move the tower onto peg 2 · the clock starts on your first move'
          : 'move the tower onto peg 2 · the clock is running';
    return;
  }
  if (!S.duel) {
    t.className = 'turn h';
    who.textContent = S.game === 'ms' ? 'Minesweeper' : 'Puzzle';
    hint.textContent =
      S.game === 'ms' ? (flagMode ? 'flag mode active' : 'tap to open · right-click to flag') : 'one shot wins';
  } else if (S.turn === 'human') {
    t.className = 'turn h';
    who.textContent = 'Your turn';
    hint.textContent =
      S.game === 'ms' ? (claimMode ? 'claiming: tap where you think a mine is' : 'tap to open') : 'tap a column';
  } else {
    t.className = 'turn a';
    who.textContent = "Agent's turn";
    hint.textContent = 'waiting on its tool call…';
  }
}

function paintRoundLine(): void {
  const L = document.getElementById('rlLeft')!;
  const R = document.getElementById('rlRight')!;

  if (S.game === 'ms') {
    if (S.duel) {
      L.innerHTML = `round mines — you <b>${S.round.human}</b> · agent <b>${S.round.agent}</b>`;
      R.innerHTML = `<b>${MS.mines - taken.size}</b> of ${MS.mines} left`;
    } else {
      L.innerHTML = `<b>${flags.size}</b> flags placed`;
      R.innerHTML = `<b>${Math.max(0, MS.mines - flags.size)}</b> mines left to mark`;
    }
  } else if (S.game === 'c4') {
    if (S.duel) {
      L.innerHTML = '<b class="tag h">you in red</b> · <b class="tag a">agent in black</b>';
      R.textContent = 'four in a row wins';
    } else {
      L.textContent = c4Msg || '';
      R.innerHTML = `<b>${S.solo.c4Solved}</b> solved`;
    }
  } else if (S.game === 'hanoi') {
    if (S.duel) {
      L.innerHTML = `<b class="tag h">you ${hanoiMoves.human}</b> · <b class="tag a">agent ${hanoiMoves.agent}</b>`;
      R.innerHTML = `moves · <b>${OPTIMAL}</b> is optimal`;
    } else {
      // No clock here on purpose: the one under the board is the live one, and
      // this line is only repainted on a move, so it sat there showing a time
      // that had stopped a second ago while the real one ticked past it.
      L.innerHTML = `<b>${plural(hanoiMoves.human)}</b> · <b>${OPTIMAL}</b> is optimal`;
      R.innerHTML = S.solo.hanoiBest ? `best <b>${fmt(S.solo.hanoiBest)}</b>` : 'move the tower onto peg 2';
    }
  } else if (S.duel) {
    L.innerHTML = `<b class="tag h">you ${S.round.human}</b> · <b class="tag a">agent ${S.round.agent}</b>`;
    R.innerHTML = `first to <b>${PONG.target}</b> · <b>${rallies}</b> returns`;
  } else {
    L.innerHTML = `<b>${rallies}</b> returns`;
    R.innerHTML = `best <b>${S.solo.pongBest}</b>`;
  }
}

