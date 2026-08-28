import { other } from '../state';
import type { Player } from '../types';
import { C4, cells, freeRow, checkLine } from './state';

export interface C4Analysis {
  legal_columns: number[];
  winning_now: number[];
  must_block: number[];
  gives_opponent_a_win: number[];
}

export function analysis(me: Player): C4Analysis {
  const foe = other(me);
  const probe = (col: number, who: Player): { row: number; win: boolean } | null => {
    const row = freeRow(col);
    if (row === -1) return null;
    cells[row][col] = who;
    const w = checkLine(row, col, who);
    cells[row][col] = null;
    return { row, win: !!w };
  };

  const legal: number[] = [];
  const wins: number[] = [];
  const blocks: number[] = [];
  const traps: number[] = [];
  for (let x = 0; x < C4.w; x++) {
    const mine = probe(x, me);
    if (!mine) continue;
    legal.push(x);
    if (mine.win) wins.push(x);
    const threat = probe(x, foe);
    if (threat && threat.win) blocks.push(x);
    if (mine.row > 0) {
      cells[mine.row][x] = me;
      const up = probe(x, foe);
      cells[mine.row][x] = null;
      if (up && up.win) traps.push(x);
    }
  }
  return { legal_columns: legal, winning_now: wins, must_block: blocks, gives_opponent_a_win: traps };
}

export function boardText(): string {
  let s = '';
  for (let y = 0; y < C4.h; y++)
    s += cells[y].map((v) => (v === 'human' ? 'H' : v === 'agent' ? 'A' : '.')).join(' ') + '\n';
  return s + '-'.repeat(C4.w * 2 - 1) + '\n' + Array.from({ length: C4.w }, (_, x) => x).join(' ');
}
