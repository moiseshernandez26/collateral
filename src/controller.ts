import { S } from './state';
import type { GameId } from './types';
import { RULES } from './rules-text';
import { registerGameTools } from './tools/registry';
import { resetRoundMetrics, resetMatchMetrics } from './metrics';
import { paintMetrics, clearLog, setToolCount } from './log';
import { paintActs } from './acts';
import { MS, taken, flags, claimMode, flagMode, newBoard as msNewBoard } from './minesweeper/state';
import { buildGrid as buildMsGrid, paintBoard as paintMsBoard } from './minesweeper/render';
import { blank as c4Blank, msg as c4Msg } from './connect4/state';
import { generatePuzzle } from './connect4/actions';
import { buildGrid as buildC4Grid, paintBoard as paintC4Board } from './connect4/render';
import { PONG, blank as pongBlank, rallies, thinking, awaitingStart } from './pong/state';
import { startRound as pongStart } from './pong/actions';
import { releaseWaiter } from './pong/agent';
import { buildGrid as buildPongGrid, paintBoard as paintPongBoard, stopLoop as stopPongLoop } from './pong/render';
import { showReady, hideReady } from './pong/ready';

const GAME_TAG: Record<GameId, string> = { ms: 'minesweeper', c4: 'connect 4', pong: 'pong' };
const SOLO_LABEL: Record<GameId, string> = { ms: 'games won', c4: 'puzzles solved', pong: 'best run' };

export function paint(extra?: string[] | { drop?: [number, number] }): void {
  if (S.game === 'ms') paintMsBoard(Array.isArray(extra) ? extra : undefined);
  else if (S.game === 'c4') paintC4Board(Array.isArray(extra) ? undefined : extra?.drop);
  else paintPongBoard();

  const sb = document.getElementById('scoreBox')!;
  if (S.duel) {
    sb.innerHTML =
      `<span class="h">YOU <b>${S.series.human}</b></span>` +
      `<span class="sep">rounds</span><span class="a"><b>${S.series.agent}</b> AGENT</span>`;
  } else {
    const n = S.game === 'ms' ? S.solo.msWins : S.game === 'c4' ? S.solo.c4Solved : S.solo.pongBest;
    sb.innerHTML = `<span class="h"><b>${n}</b></span><span class="sep">${SOLO_LABEL[S.game]}</span>`;
  }

  paintTurn();
  paintRoundLine();
  paintActs();
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
  } else if (S.duel) {
    L.innerHTML = `<b class="tag h">you ${S.round.human}</b> · <b class="tag a">agent ${S.round.agent}</b>`;
    R.innerHTML = `first to <b>${PONG.target}</b> · <b>${rallies}</b> returns`;
  } else {
    L.innerHTML = `<b>${rallies}</b> returns`;
    R.innerHTML = `best <b>${S.solo.pongBest}</b>`;
  }
}

export async function startGame(id: GameId, keep: boolean): Promise<void> {
  // Leaving Pong: kill its animation loop and answer any pong_read still
  // parked on the ball, so neither outlives the game that owns them.
  if (S.game === 'pong') {
    stopPongLoop();
    releaseWaiter('not_active');
    hideReady();
  }

  S.game = id;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  resetRoundMetrics();
  if (!keep) {
    S.series = { human: 0, agent: 0 };
    S.solo = { msWins: 0, c4Solved: 0, pongBest: 0 };
    resetMatchMetrics();
    clearLog();
  }
  paintMetrics();

  for (const [tab, gid] of [
    ['tabMs', 'ms'],
    ['tabC4', 'c4'],
    ['tabPong', 'pong'],
  ] as const)
    document.getElementById(tab)!.classList.toggle('on', id === gid);
  document.getElementById('msGrid')!.style.display = id === 'ms' ? 'grid' : 'none';
  document.getElementById('c4Grid')!.style.display = id === 'c4' ? 'grid' : 'none';
  document.getElementById('pongCanvas')!.style.display = id === 'pong' ? 'block' : 'none';
  document.getElementById('rules')!.innerHTML = RULES[id + '_' + (S.duel ? 'duel' : 'solo')];
  document.getElementById('gameTag')!.textContent = GAME_TAG[id];

  if (id === 'ms') {
    msNewBoard();
    buildMsGrid();
  } else if (id === 'c4') {
    S.duel ? c4Blank() : generatePuzzle();
    buildC4Grid();
  } else {
    pongBlank();
    buildPongGrid();
    pongStart();
  }

  const live = await registerGameTools(id);
  if (S.mcp) setToolCount(live);
  paint();
  // Last, and only for a duel: the ball is parked until the human says go, and
  // the tools are already registered by now, so the agent can check in while
  // the modal is still up.
  if (id === 'pong' && S.duel) showReady();
}

document.getElementById('tabMs')!.addEventListener('click', () => startGame('ms', true));
document.getElementById('tabC4')!.addEventListener('click', () => startGame('c4', true));
document.getElementById('tabPong')!.addEventListener('click', () => startGame('pong', true));
