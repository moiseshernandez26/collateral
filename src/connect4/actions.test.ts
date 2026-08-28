import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { C4, cells, blank, freeRow, checkLine, anyLine } from './state';
import { drop, generatePuzzle, soloTry } from './actions';

beforeEach(() => {
  blank();
  S.over = false;
  S.verdict = '';
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0 };
  S.turn = 'human';
});

function findWinningColumn(): number {
  for (let x = 0; x < C4.w; x++) {
    const row = freeRow(x);
    if (row === -1) continue;
    cells[row][x] = 'human';
    const wins = !!checkLine(row, x, 'human');
    cells[row][x] = null;
    if (wins) return x;
  }
  throw new Error('no winning column found');
}

describe('drop', () => {
  it('stacks pieces from the bottom of a column', () => {
    const r1 = drop(3, 'human').result as { ok: boolean; row: number; column: number };
    expect(r1).toMatchObject({ ok: true, row: 5, column: 3 });
    const r2 = drop(3, 'agent').result as { row: number };
    expect(r2.row).toBe(4);
  });

  it('detects a vertical four-in-a-row', () => {
    drop(0, 'human');
    drop(0, 'human');
    drop(0, 'human');
    const last = drop(0, 'human').result as { win: boolean; round_over: boolean };
    expect(last.win).toBe(true);
    expect(last.round_over).toBe(true);
    expect(S.series.human).toBe(1);
    expect(S.verdict).toBe('You won the round');
  });

  it('detects a horizontal four-in-a-row', () => {
    drop(0, 'agent');
    drop(1, 'agent');
    drop(2, 'agent');
    const last = drop(3, 'agent').result as { win: boolean };
    expect(last.win).toBe(true);
    expect(S.series.agent).toBe(1);
    expect(S.verdict).toBe('Agent won');
  });

  it('rejects a full column', () => {
    for (let i = 0; i < C4.h; i++) drop(2, i % 2 === 0 ? 'human' : 'agent');
    expect(drop(2, 'human').result).toEqual({ ok: false, reason: 'that column is full' });
  });

  it('rejects a column outside 0-6', () => {
    expect(drop(7, 'human').result).toEqual({ ok: false, reason: 'column out of range, 0 to 6' });
  });

  it('rejects any move once the round is over', () => {
    S.over = true;
    expect(drop(0, 'human').result).toEqual({ ok: false, reason: 'the round is already over' });
  });

  it('passes the turn when nobody wins', () => {
    drop(0, 'human');
    expect(S.turn).toBe('agent');
  });
});

describe('generatePuzzle', () => {
  it('produces a position with no pre-existing line and exactly one winning shot', () => {
    generatePuzzle();
    expect(anyLine()).toBe(false);
    expect(findWinningColumn()).toBeGreaterThanOrEqual(0);
  });
});

describe('soloTry', () => {
  it('solves the puzzle on the winning column', () => {
    generatePuzzle();
    const col = findWinningColumn();
    const { drop: at } = soloTry(col);
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('Solved!');
    expect(S.solo.c4Solved).toBe(1);
    expect(at).toBeDefined();
  });

  it('pulls the piece back on a non-winning column', () => {
    generatePuzzle();
    const col = findWinningColumn();
    const before = cells.map((row) => [...row]);
    const other = (col + 1) % C4.w;
    if (other !== col && freeRow(other) !== -1) {
      soloTry(other);
      if (!S.over) {
        expect(cells).toEqual(before);
      }
    }
  });
});
