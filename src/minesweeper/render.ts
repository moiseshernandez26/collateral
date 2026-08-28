import { S } from '../state';
import { paint } from '../controller';
import { MS, mines, opened, taken, flags, lost, claimMode, flagMode, count, setClaimMode } from './state';
import { reveal, claim, soloReveal, soloFlag } from './actions';

const msGrid = document.getElementById('msGrid')!;

export function buildGrid(): void {
  msGrid.style.gridTemplateColumns = `repeat(${MS.w}, auto)`;
  msGrid.innerHTML = '';
  for (let y = 0; y < MS.h; y++)
    for (let x = 0; x < MS.w; x++) {
      const b = document.createElement('button');
      b.className = 'ms';
      b.dataset.k = `${x},${y}`;
      b.setAttribute('aria-label', `cell ${x}, ${y}`);
      b.addEventListener('click', () => {
        if (S.game !== 'ms' || S.over) return;
        if (S.duel) {
          if (S.turn !== 'human') return;
          if (claimMode) {
            setClaimMode(false);
            claim(x, y, 'human');
            paint();
          } else {
            const { openedKeys } = reveal(x, y, 'human');
            paint(openedKeys);
          }
        } else if (flagMode) {
          soloFlag(x, y);
          paint();
        } else {
          const { openedKeys } = soloReveal(x, y);
          paint(openedKeys);
        }
      });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (S.game === 'ms' && !S.duel && !S.over) {
          soloFlag(x, y);
          paint();
        }
      });
      msGrid.appendChild(b);
    }
}

export function paintBoard(pulse?: string[]): void {
  msGrid.classList.toggle('board-claim', S.duel && claimMode && S.turn === 'human' && !S.over);
  for (const b of Array.from(msGrid.children) as HTMLElement[]) {
    const k = b.dataset.k!;
    const [x, y] = k.split(',').map(Number);
    b.className = 'ms';
    b.textContent = '';
    if (S.duel && taken.has(k)) {
      const t = taken.get(k)!;
      b.classList.add('taken', t.by === 'human' ? 'byh' : 'bya');
      if (t.boom) b.classList.add('boom');
      b.textContent = t.boom ? '✹' : '⚑';
      continue;
    }
    if (!S.duel) {
      if (flags.has(k)) {
        b.classList.add('flag');
        b.textContent = '⚑';
        continue;
      }
      if (lost && mines.has(k) && !opened.has(k)) {
        b.classList.add('shown');
        b.textContent = '✹';
        continue;
      }
    }
    if (!opened.has(k)) continue;
    b.classList.add('open');
    if (mines.has(k)) {
      b.classList.add('boom');
      b.textContent = '✹';
      continue;
    }
    const v = count[y][x];
    b.textContent = v ? String(v) : '';
    if (v) b.classList.add('n' + v);
  }
  if (pulse && pulse.length && window.anime) {
    const els = pulse.map((k) => msGrid.querySelector(`[data-k="${k}"]`)).filter(Boolean);
    window.anime({ targets: els, scale: [0.6, 1], duration: 320, delay: window.anime.stagger(13), easing: 'easeOutBack' });
  }
}
