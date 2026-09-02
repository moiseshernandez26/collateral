import { S } from '../state';
import { paint } from '../controller';
import { HANOI, peg, moves, picked, setPicked, canMove, elapsedFor, startedAt, fmt } from './state';
import { move, beginRace } from './actions';

const boards = document.getElementById('hanoiBoards')!;
const mine = document.getElementById('hanoiMine')!;
const theirs = document.getElementById('hanoiTheirs')!;
const theirsWrap = document.getElementById('hanoiTheirsWrap')!;
const clock = document.getElementById('hanoiClock')!;

let wired = false;
let ticker = 0;

function wire(): void {
  if (wired) return;
  wired = true;
  // Space starts the race by hand, for ?duo=1 and for a demo with no agent
  // attached. Not a button: starting is the agent's to do, and a button gets
  // pressed by reflex before it has checked in.
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' || S.game !== 'hanoi' || S.over || startedAt !== null) return;
    e.preventDefault();
    beginRace();
    paint();
  });
}

/** Click a peg to pick it up, click another to drop. Two clicks rather than a
 *  drag, so the whole game is reachable from the keyboard for free. */
function onPeg(p: number): void {
  if (S.game !== 'hanoi' || S.over) return;
  if (S.duel && startedAt === null) return;
  if (picked === null) {
    if (peg.human[p].length) setPicked(p);
  } else if (picked === p) {
    setPicked(null);
  } else {
    if (canMove('human', picked, p)) move(picked, p, 'human');
    setPicked(null);
  }
  paint();
}

export function buildGrid(): void {
  wire();
  for (const [board, who] of [
    [mine, 'human'],
    [theirs, 'agent'],
  ] as const) {
    board.innerHTML = '';
    for (let p = 0; p < HANOI.pegs; p++) {
      const el = document.createElement(who === 'human' ? 'button' : 'div');
      el.className = 'peg';
      el.dataset.p = String(p);
      el.innerHTML = `<div class="discs"></div><div class="base"></div><div class="pegno">${p}</div>`;
      if (who === 'human') {
        el.setAttribute('aria-label', `peg ${p}`);
        el.addEventListener('click', () => onPeg(p));
      }
      board.appendChild(el);
    }
  }
  theirsWrap.style.display = S.duel ? '' : 'none';
  boards.classList.toggle('solo', !S.duel);
  startTicker();
}

export function stopTicker(): void {
  if (ticker) clearInterval(ticker);
  ticker = 0;
}

// Only the clock text needs this. The elapsed time itself is computed from
// timestamps, so a throttled background tab makes the display stutter and
// never makes the race wrong.
function startTicker(): void {
  if (ticker) return;
  ticker = window.setInterval(() => {
    if (S.game !== 'hanoi') return stopTicker();
    if (startedAt !== null && !S.over) paintClock();
  }, 100);
}

function paintClock(): void {
  const parts = [`<b>${fmt(elapsedFor('human'))}</b>`, `you <b>${moves.human}</b> moves`];
  if (S.duel) parts.push(`agent <b>${moves.agent}</b>`);
  clock.innerHTML = startedAt === null ? 'clock not started' : parts.join(' · ');
}

export function paintBoard(): void {
  paintSide(mine, 'human');
  if (S.duel) paintSide(theirs, 'agent');
  paintClock();
  if (startedAt !== null && !S.over) startTicker();
}

function paintSide(board: HTMLElement, who: 'human' | 'agent'): void {
  for (const el of Array.from(board.children) as HTMLElement[]) {
    const p = Number(el.dataset.p);
    const stack = peg[who][p];
    el.classList.toggle('picked', who === 'human' && picked === p);
    el.classList.toggle('target', who === 'human' && picked !== null && picked !== p && canMove('human', picked, p));
    el.classList.toggle('done', p === HANOI.pegs - 1 && stack.length === HANOI.discs);
    const discs = el.querySelector('.discs')!;
    discs.innerHTML = stack
      .map((d) => `<i class="disc d${d}" style="width:${18 + d * 15}px"><b>${d}</b></i>`)
      .reverse()
      .join('');
  }
}
