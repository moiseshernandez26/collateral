import { S } from './state';
import type { GameId } from './types';
import { RULES } from './rules-text';
import { registerGameTools } from './tools/registry';
import { resetRoundMetrics, resetMatchMetrics } from './metrics';
import { paintMetrics, clearLog, setToolCount } from './log';
import { paintActs } from './acts';
import { paintHud } from './hud';
import { paintSay } from './say';
import { newBoard as msNewBoard } from './minesweeper/state';
import { buildGrid as buildMsGrid, paintBoard as paintMsBoard } from './minesweeper/render';
import { blank as c4Blank } from './connect4/state';
import { generatePuzzle } from './connect4/actions';
import { buildGrid as buildC4Grid, paintBoard as paintC4Board } from './connect4/render';
import { blank as pongBlank } from './pong/state';
import { startRound as pongStart } from './pong/actions';
import { releaseWaiter } from './pong/agent';
import { buildGrid as buildPongGrid, paintBoard as paintPongBoard, stopLoop as stopPongLoop } from './pong/render';
import { showReady, hideReady } from './pong/ready';
import { blank as hanoiBlank, fmt } from './hanoi/state';
import { buildGrid as buildHanoiGrid, paintBoard as paintHanoiBoard, stopTicker } from './hanoi/render';

const GAME_TAG: Record<GameId, string> = { ms: 'minesweeper', c4: 'connect 4', pong: 'pong', hanoi: 'hanoi' };
const SOLO_LABEL: Record<GameId, string> = { ms: 'games won', c4: 'puzzles solved', pong: 'best run', hanoi: 'best time' };

export type PaintExtra = string[] | { drop?: [number, number]; shot?: number };

export function paint(extra?: PaintExtra): void {
  const detail = Array.isArray(extra) ? undefined : extra;
  if (S.game === 'ms') paintMsBoard(Array.isArray(extra) ? extra : undefined);
  else if (S.game === 'c4') paintC4Board(detail?.drop);
  else if (S.game === 'hanoi') paintHanoiBoard();
  else paintPongBoard();

  const sb = document.getElementById('scoreBox')!;
  if (S.duel) {
    sb.innerHTML =
      `<span class="h">YOU <b>${S.series.human}</b></span>` +
      `<span class="sep">rounds</span><span class="a"><b>${S.series.agent}</b> AGENT</span>`;
  } else {
    // Hanoi's is a clock, not a count, so it arrives already formatted.
    const n =
      S.game === 'ms'
        ? S.solo.msWins
        : S.game === 'c4'
          ? S.solo.c4Solved
          : S.game === 'hanoi'
            ? S.solo.hanoiBest
              ? fmt(S.solo.hanoiBest)
              : '—'
            : S.solo.pongBest;
    sb.innerHTML = `<span class="h"><b>${n}</b></span><span class="sep">${SOLO_LABEL[S.game]}</span>`;
  }

  paintHud();
  paintActs();
  paintSay();
}

export async function startGame(id: GameId, keep: boolean): Promise<void> {
  // Leaving Pong: kill its animation loop and answer any pong_read still
  // parked on the ball, so neither outlives the game that owns them.
  if (S.game === 'pong') {
    stopPongLoop();
    releaseWaiter('not_active');
    hideReady();
  }
  if (S.game === 'hanoi') stopTicker();

  S.game = id;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  resetRoundMetrics();
  if (!keep) {
    S.series = { human: 0, agent: 0 };
    S.solo = { msWins: 0, c4Solved: 0, pongBest: 0, hanoiBest: 0 };
    resetMatchMetrics();
    clearLog();
  }
  paintMetrics();

  for (const [tab, gid] of [
    ['tabMs', 'ms'],
    ['tabC4', 'c4'],
    ['tabPong', 'pong'],
    ['tabHanoi', 'hanoi'],
  ] as const)
    document.getElementById(tab)!.classList.toggle('on', id === gid);
  document.getElementById('msGrid')!.style.display = id === 'ms' ? 'grid' : 'none';
  document.getElementById('c4Grid')!.style.display = id === 'c4' ? 'grid' : 'none';
  document.getElementById('pongCanvas')!.style.display = id === 'pong' ? 'block' : 'none';
  document.getElementById('hanoiBoards')!.style.display = id === 'hanoi' ? 'flex' : 'none';
  document.getElementById('rules')!.innerHTML = RULES[id + '_' + (S.duel ? 'duel' : 'solo')];
  document.getElementById('gameTag')!.textContent = GAME_TAG[id];

  if (id === 'ms') {
    msNewBoard();
    buildMsGrid();
  } else if (id === 'c4') {
    S.duel ? c4Blank() : generatePuzzle();
    buildC4Grid();
  } else if (id === 'hanoi') {
    hanoiBlank();
    buildHanoiGrid();
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
document.getElementById('tabHanoi')!.addEventListener('click', () => startGame('hanoi', true));
