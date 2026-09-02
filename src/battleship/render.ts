import { S } from '../state';
import { paint } from '../controller';
import { refuseHandPlay } from '../log';
import { BS, idx, xy, side, sunkAt, shipAt, showMap } from './state';
import { fire, soloFire } from './actions';
import { knownGrid, scores } from './query';

const wrap = document.getElementById('bsGrids')!;
const enemy = document.getElementById('bsEnemy')!;
const own = document.getElementById('bsOwn')!;
const ownWrap = document.getElementById('bsOwnWrap')!;

function cellButton(grid: HTMLElement, x: number, y: number, label: string, fn?: () => void): void {
  const b = document.createElement('button');
  b.className = 'bs';
  b.dataset.c = String(idx(x, y));
  b.setAttribute('aria-label', label);
  if (fn) b.addEventListener('click', fn);
  else b.disabled = true;
  grid.appendChild(b);
}

export function buildGrid(): void {
  for (const g of [enemy, own]) {
    g.innerHTML = '';
    g.style.gridTemplateColumns = `repeat(${BS.n}, 1fr)`;
  }
  for (let y = 0; y < BS.n; y++)
    for (let x = 0; x < BS.n; x++) {
      cellButton(enemy, x, y, `fire at ${x}, ${y}`, () => {
        if (S.game !== 'bs' || S.over) return;
        if (S.duel) {
          if (S.turn !== 'human') return refuseHandPlay();
          const { cell } = fire(x, y, 'human');
          paint(cell === null ? undefined : { shot: cell });
        } else {
          const { cell } = soloFire(x, y);
          paint(cell === null ? undefined : { shot: cell });
        }
      });
      cellButton(own, x, y, `your waters ${x}, ${y}`);
    }
  ownWrap.style.display = S.duel ? '' : 'none';
  wrap.classList.toggle('solo', !S.duel);
}

export function paintBoard(shot?: number): void {
  paintEnemy();
  if (S.duel) paintOwn();

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (shot !== undefined && window.anime && !reduceMotion) {
    // The splash marks which cell was just fired at, which matters most when
    // it was the agent firing and nobody watched a cursor move to it.
    const inOwn = side.human.shotAt.has(shot) && S.duel && S.turn === 'human';
    const el = (inOwn ? own : enemy).querySelector(`[data-c="${shot}"]`);
    if (el) window.anime({ targets: el, scale: [1.6, 1], duration: 380, easing: 'easeOutBack' });
  }
}

/** The board the human fires at: only what their own shots have revealed. */
function paintEnemy(): void {
  const grid = knownGrid('human');
  for (const b of Array.from(enemy.children) as HTMLButtonElement[]) {
    const cell = Number(b.dataset.c);
    b.className = 'bs ' + ({ unknown: '', miss: 'miss', hit: 'hit', sunk: 'sunk' }[grid[cell]] || '');
    b.disabled = S.over || grid[cell] !== 'unknown';
    // Losing the round should not leave the enemy fleet a mystery.
    if (S.over && grid[cell] === 'unknown' && shipAt('agent', cell)) b.classList.add('reveal');
  }
}

/** The human's own waters: their fleet, and where the agent has been firing. */
function paintOwn(): void {
  const heat = showMap ? scores('agent') : null;
  const top = heat ? Math.max(...heat) : 0;
  for (const b of Array.from(own.children) as HTMLButtonElement[]) {
    const cell = Number(b.dataset.c);
    const hasShip = !!shipAt('human', cell);
    const wasShot = side.human.shotAt.has(cell);
    b.className = 'bs own';
    if (hasShip) b.classList.add('ship');
    if (wasShot) b.classList.add(sunkAt.human.has(cell) ? 'sunk' : hasShip ? 'hit' : 'miss');
    b.style.removeProperty('--heat');
    // The agent's own targeting map, drawn over the human's fleet. It is the
    // deduction bs_targets handed it — the room gets to see the agent was given
    // the answer, and then watch whether it took the shot the map points at.
    if (heat && top > 0 && !wasShot && heat[cell] > 0) {
      b.classList.add('heat');
      b.style.setProperty('--heat', String(Math.max(0.12, heat[cell] / top)));
      const [x, y] = xy(cell);
      b.setAttribute('aria-label', `your waters ${x}, ${y}, agent rates it ${heat[cell]}`);
    }
  }
}
