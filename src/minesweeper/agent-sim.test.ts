// Task 4.3: with no real agent attached, this simulates one using only what
// ms_frontier hands out — the same constraint an agent gets over WebMCP — and
// checks the deduction is actually sound, not just plausible-looking.
import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { MS, mines, opened, taken, newBoard } from './state';
import { reveal, claim } from './actions';
import { frontier } from './query';

beforeEach(() => {
  S.duel = true;
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
});

describe('an agent that only ever acts on ms_frontier deductions', () => {
  it('never claims a safe cell or opens a real mine, across many boards', () => {
    for (let game = 0; game < 25; game++) {
      newBoard();
      S.over = false;
      reveal(4, 4, 'agent');

      let steps = 0;
      while (!S.over && steps < 300) {
        steps++;
        const entries = frontier();
        let acted = false;

        for (const e of entries) {
          if (e.remaining > 0 && e.remaining === e.unknown.length) {
            for (const u of e.unknown) {
              expect(mines.has(u)).toBe(true);
              if (!taken.has(u)) {
                const [x, y] = u.split(',').map(Number);
                claim(x, y, 'agent');
              }
            }
            acted = true;
            break;
          }
          if (e.remaining === 0 && e.unknown.length) {
            for (const u of e.unknown) {
              expect(mines.has(u)).toBe(false);
              if (!opened.has(u)) {
                const [x, y] = u.split(',').map(Number);
                reveal(x, y, 'agent');
              }
            }
            acted = true;
            break;
          }
        }

        if (!acted) {
          const candidates: [number, number][] = [];
          for (let y = 0; y < MS.h; y++)
            for (let x = 0; x < MS.w; x++) {
              const k = `${x},${y}`;
              if (!opened.has(k) && !taken.has(k)) candidates.push([x, y]);
            }
          if (!candidates.length) break;
          const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
          reveal(x, y, 'agent');
        }
      }
      expect(steps).toBeLessThan(300);
    }
  });
});
