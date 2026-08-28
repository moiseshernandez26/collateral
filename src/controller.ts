import { S } from './state';
import type { GameId } from './types';
import { RULES } from './rules-text';
import { registerGameTools, getToolCount } from './tools/registry';
import { CORE } from './tools/core';
import { MS, taken, flags, claimMode, flagMode, fresh, newBoard as msNewBoard, toggleClaimMode, toggleFlagMode } from './minesweeper/state';
import { buildGrid as buildMsGrid, paintBoard as paintMsBoard } from './minesweeper/render';
import { blank as c4Blank, msg as c4Msg } from './connect4/state';
import { generatePuzzle } from './connect4/actions';
import { buildGrid as buildC4Grid, paintBoard as paintC4Board } from './connect4/render';

const actsEl = document.getElementById('acts')!;

export function paint(extra?: string[] | { drop?: [number, number] }): void {
  if (S.game === 'ms') paintMsBoard(Array.isArray(extra) ? extra : undefined);
  else paintC4Board(Array.isArray(extra) ? undefined : extra?.drop);

  const sb = document.getElementById('scoreBox')!;
  if (S.duel) {
    sb.innerHTML =
      `<span class="h">YOU <b>${S.series.human}</b></span>` +
      `<span class="sep">rounds</span><span class="a"><b>${S.series.agent}</b> AGENT</span>`;
  } else {
    const n = S.game === 'ms' ? S.solo.msWins : S.solo.c4Solved;
    const label = S.game === 'ms' ? 'games won' : 'puzzles solved';
    sb.innerHTML = `<span class="h"><b>${n}</b></span><span class="sep">${label}</span>`;
  }

  const t = document.getElementById('turn')!;
  const who = t.querySelector('.who')!;
  const hint = document.getElementById('turnHint')!;
  if (S.over) {
    t.className = 'turn over';
    who.textContent = S.verdict;
    hint.textContent = S.duel ? 'tap "New round"' : S.game === 'ms' ? 'tap "New game"' : 'tap "Next puzzle"';
  } else if (!S.duel) {
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
  } else if (S.duel) {
    L.innerHTML = 'you in red · agent in black';
    R.textContent = 'four in a row wins';
  } else {
    L.textContent = c4Msg || '';
    R.innerHTML = `<b>${S.solo.c4Solved}</b> solved`;
  }
  paintActs();
}

function btn(label: string, fn: () => void, opts?: { on?: boolean; disabled?: boolean }): void {
  const b = document.createElement('button');
  b.textContent = label;
  if (opts?.on) b.className = 'on';
  if (opts?.disabled) b.disabled = true;
  b.addEventListener('click', fn);
  actsEl.appendChild(b);
}

function paintActs(): void {
  actsEl.innerHTML = '';
  if (S.game === 'ms') {
    if (S.duel) {
      btn(
        claimMode ? 'Claiming mine' : 'Claim mine',
        () => {
          toggleClaimMode();
          paint();
        },
        { on: claimMode, disabled: S.over || S.turn !== 'human' || fresh },
      );
      btn('New round', () => startGame('ms', true));
      btn('Reset score', () => {
        S.series = { human: 0, agent: 0 };
        startGame('ms', false);
      });
    } else {
      btn(
        flagMode ? 'Flag active' : 'Place flags',
        () => {
          toggleFlagMode();
          paint();
        },
        { on: flagMode, disabled: S.over },
      );
      btn('New game', () => startGame('ms', true));
    }
  } else if (S.duel) {
    btn('New round', () => startGame('c4', true));
    btn('Reset score', () => {
      S.series = { human: 0, agent: 0 };
      startGame('c4', false);
    });
  } else {
    btn(S.over ? 'Next puzzle' : 'Skip puzzle', () => startGame('c4', true));
  }
}

export async function startGame(id: GameId, keep: boolean): Promise<void> {
  S.game = id;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  if (!keep) {
    S.series = { human: 0, agent: 0 };
    S.solo = { msWins: 0, c4Solved: 0 };
  }
  document.getElementById('tabMs')!.classList.toggle('on', id === 'ms');
  document.getElementById('tabC4')!.classList.toggle('on', id === 'c4');
  document.getElementById('msGrid')!.style.display = id === 'ms' ? 'grid' : 'none';
  document.getElementById('c4Grid')!.style.display = id === 'c4' ? 'grid' : 'none';
  document.getElementById('rules')!.innerHTML = RULES[id + '_' + (S.duel ? 'duel' : 'solo')];
  document.getElementById('gameTag')!.textContent = id === 'ms' ? 'minesweeper' : 'connect 4';

  if (id === 'ms') {
    msNewBoard();
    buildMsGrid();
  } else {
    S.duel ? c4Blank() : generatePuzzle();
    buildC4Grid();
  }

  await registerGameTools(id);
  if (S.mcp) document.getElementById('pill')!.textContent = `${CORE.length + getToolCount(id)} tools active`;
  paint();
}

document.getElementById('tabMs')!.addEventListener('click', () => startGame('ms', true));
document.getElementById('tabC4')!.addEventListener('click', () => startGame('c4', true));
