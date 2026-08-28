import { S } from '../state';
import { paint } from '../controller';
import { C4, cells, winLine } from './state';
import { drop, soloTry } from './actions';

const c4Grid = document.getElementById('c4Grid')!;

export function buildGrid(): void {
  c4Grid.innerHTML = '';
  for (let y = 0; y < C4.h; y++)
    for (let x = 0; x < C4.w; x++) {
      const b = document.createElement('button');
      b.className = 'c4';
      b.dataset.p = `${y},${x}`;
      b.setAttribute('aria-label', `column ${x}`);
      b.addEventListener('click', () => {
        if (S.game !== 'c4' || S.over) return;
        if (S.duel) {
          if (S.turn !== 'human') return;
          const { drop: at } = drop(x, 'human');
          paint({ drop: at });
        } else {
          const { drop: at } = soloTry(x);
          paint({ drop: at });
        }
      });
      c4Grid.appendChild(b);
    }
}

export function paintBoard(dropAt?: [number, number]): void {
  for (const b of Array.from(c4Grid.children) as HTMLElement[]) {
    const [y, x] = b.dataset.p!.split(',').map(Number);
    b.className = 'c4';
    const v = cells[y][x];
    if (v) b.classList.add(v === 'human' ? 'h' : 'a', 'dead');
    if (winLine.some(([wy, wx]) => wy === y && wx === x)) b.classList.add('win');
  }
  if (dropAt && window.anime) {
    const el = c4Grid.querySelector(`[data-p="${dropAt[0]},${dropAt[1]}"]`);
    if (el) window.anime({ targets: el, translateY: [-58 * (dropAt[0] + 1), 0], duration: 400, easing: 'easeOutBounce' });
  }
}
