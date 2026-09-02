import { other } from '../state';
import type { Player } from '../types';
import { BS, idx, xy, inBoard, side, sunkAt, afloat, shipAt } from './state';

export type Known = 'unknown' | 'miss' | 'hit' | 'sunk';

/**
 * What `who` has legitimately learned about the enemy's waters. Everything the
 * aid and the board text are built from goes through here, which is what makes
 * the information boundary a property of the code rather than a promise: there
 * is no path from a tool to `side[foe].ships` except via cells already fired at.
 */
export function knownGrid(who: Player): Known[] {
  const foe = other(who);
  const grid: Known[] = new Array(BS.n * BS.n).fill('unknown');
  for (const cell of side[foe].shotAt) {
    if (sunkAt[foe].has(cell)) grid[cell] = 'sunk';
    else grid[cell] = shipAt(foe, cell) ? 'hit' : 'miss';
  }
  return grid;
}

const neighbours = (cell: number): number[] => {
  const [x, y] = xy(cell);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inBoard(x + dx, y + dy)) out.push(idx(x + dx, y + dy));
  return out;
};

/**
 * The deduction aid, in the same spirit as ms_frontier and c4_analysis: count,
 * for every cell, how many placements of the enemy's remaining ships are still
 * consistent with everything the shots have revealed. An agent reasoning about
 * this from the raw grid plays badly; handed the counts, it plays well.
 *
 * Two rules do the work. A placement is out if it covers a miss or a sunk cell,
 * or if it touches a sunk ship — ships may not be adjacent, and that rule is in
 * the visible rules text, so both sides may use it. And once there is a hit that
 * no sunk ship accounts for, only placements covering it are counted: that turns
 * the map from hunting into finishing the wounded ship, which is the difference
 * between an agent that looks lucky and one that looks like it is playing.
 */
export function scores(who: Player): number[] {
  const grid = knownGrid(who);
  const out = new Array(BS.n * BS.n).fill(0);
  const wounded: number[] = [];
  const forbidden = new Set<number>();

  grid.forEach((v, cell) => {
    if (v === 'hit') wounded.push(cell);
    if (v === 'miss') forbidden.add(cell);
    if (v === 'sunk') {
      forbidden.add(cell);
      for (const nb of neighbours(cell)) if (grid[nb] !== 'hit') forbidden.add(nb);
    }
  });

  for (const len of afloat(other(who))) {
    for (let y = 0; y < BS.n; y++)
      for (let x = 0; x < BS.n; x++)
        for (const horizontal of [true, false]) {
          const cells: number[] = [];
          for (let k = 0; k < len; k++) {
            const cx = x + (horizontal ? k : 0);
            const cy = y + (horizontal ? 0 : k);
            if (!inBoard(cx, cy)) {
              cells.length = 0;
              break;
            }
            cells.push(idx(cx, cy));
          }
          if (cells.length !== len) continue;
          if (cells.some((c) => forbidden.has(c))) continue;
          if (wounded.length && !cells.some((c) => grid[c] === 'hit')) continue;
          for (const c of cells) if (grid[c] === 'unknown') out[c]++;
        }
  }
  return out;
}

export interface Target {
  x: number;
  y: number;
  score: number;
}

export function targets(who: Player): Record<string, unknown> {
  const grid = knownGrid(who);
  const s = scores(who);
  const ranked: Target[] = [];
  s.forEach((score, cell) => {
    if (score > 0 && grid[cell] === 'unknown') {
      const [x, y] = xy(cell);
      ranked.push({ x, y, score });
    }
  });
  ranked.sort((a, b) => b.score - a.score);

  const wounded = grid.reduce<Target[]>((acc, v, cell) => {
    if (v === 'hit') {
      const [x, y] = xy(cell);
      acc.push({ x, y, score: 0 });
    }
    return acc;
  }, []);

  return {
    mode: wounded.length ? 'finish' : 'hunt',
    explanation: wounded.length
      ? 'a ship is hit and not sunk: only placements covering it are counted, so the top cell finishes it'
      : 'no wounded ship: the counts are how many ways the remaining ships still fit over each cell',
    enemy_ships_afloat: afloat(other(who)),
    hits_not_yet_sunk: wounded.map(({ x, y }) => ({ x, y })),
    best: ranked[0] ?? null,
    candidates: ranked.slice(0, 8),
    cells_never_fired_at: grid.filter((v) => v === 'unknown').length,
  };
}

const MARK: Record<Known, string> = { unknown: '.', miss: 'o', hit: 'X', sunk: '#' };

export function boardText(who: Player): string {
  const grid = knownGrid(who);
  const head = '   ' + Array.from({ length: BS.n }, (_, x) => x).join(' ');
  const rows = Array.from({ length: BS.n }, (_, y) => {
    const cells = Array.from({ length: BS.n }, (_, x) => MARK[grid[idx(x, y)]]);
    return `${y}  ${cells.join(' ')}`;
  });
  const mine = side[who].ships.map((s) => `${s.len}${s.hits >= s.len ? ' sunk' : s.hits ? ` (${s.hits} hit)` : ''}`);
  return [
    "enemy waters, as far as your shots have shown. '.' never fired at, 'o' miss, 'X' hit, '#' sunk",
    head,
    ...rows,
    `enemy ships still afloat: ${afloat(other(who)).join(', ') || 'none'}`,
    `your own fleet: ${mine.join(' · ')}`,
    'you cannot see where their ships are. Nothing here will tell you: fire and find out, and use bs_targets to fire well.',
  ].join('\n');
}
