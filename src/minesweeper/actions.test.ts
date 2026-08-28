import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { MS, mines, opened, flags, newBoard } from './state';
import { reveal, claim, soloReveal, soloFlag } from './actions';

function findMine(exclude: Set<string> = new Set()): [number, number] {
  for (const k of mines) {
    if (!exclude.has(k)) {
      const [x, y] = k.split(',').map(Number);
      return [x, y];
    }
  }
  throw new Error('no mine found');
}

function findSafeUnopened(): [number, number] {
  for (let y = 0; y < MS.h; y++)
    for (let x = 0; x < MS.w; x++) {
      const k = `${x},${y}`;
      if (!mines.has(k) && !opened.has(k)) return [x, y];
    }
  throw new Error('no safe unopened cell found');
}

beforeEach(() => {
  newBoard();
  S.duel = true;
  S.over = false;
  S.turn = 'agent';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0 };
});

describe('reveal', () => {
  it('never places a mine under the first click', () => {
    const r = reveal(0, 0, 'human');
    expect(r.result.ok).toBe(true);
    expect((r.result as { result: string }).result).toBe('safe');
    expect(mines.size).toBe(MS.mines);
  });

  it('awards the point to the opponent when a mine is opened', () => {
    reveal(0, 0, 'agent'); // seeds the board away from (0,0)
    const [mx, my] = findMine();
    const result = reveal(mx, my, 'agent').result as { ok: boolean; result: string; point_for: string };
    expect(result.ok).toBe(true);
    expect(result.result).toBe('mine');
    expect(result.point_for).toBe('human');
    expect(S.round.human).toBe(1);
  });

  it('rejects an out-of-bounds cell', () => {
    expect(reveal(-1, 0, 'agent').result).toEqual({ ok: false, reason: 'out of bounds, x and y range from 0 to 8' });
  });

  it('rejects a non-integer coordinate', () => {
    expect(reveal(0.5, 0, 'agent').result).toEqual({ ok: false, reason: 'x and y must be integers' });
  });

  it('rejects any move once the round is over', () => {
    S.over = true;
    expect(reveal(0, 0, 'agent').result).toEqual({ ok: false, reason: 'the round is already over' });
  });

  it('rejects opening an already-open cell', () => {
    reveal(0, 0, 'agent');
    expect(reveal(0, 0, 'agent').result).toEqual({ ok: false, reason: 'that cell is already open' });
  });
});

describe('claim', () => {
  it('rejects claiming before the board has been generated', () => {
    expect(claim(0, 0, 'agent').result).toEqual({
      ok: false,
      reason: 'the board has not been generated yet, open a cell first',
    });
  });

  it('awards a point and keeps the turn on a correct claim', () => {
    reveal(0, 0, 'agent');
    const [mx, my] = findMine();
    const result = claim(mx, my, 'agent').result as {
      ok: boolean;
      result: string;
      point_for: string;
      keep_turn: boolean;
    };
    expect(result.ok).toBe(true);
    expect(result.result).toBe('correct');
    expect(result.point_for).toBe('agent');
    expect(result.keep_turn).toBe(true);
    expect(S.round.agent).toBe(1);
  });

  it('passes the turn without scoring on a wrong claim', () => {
    reveal(0, 0, 'agent');
    const [sx, sy] = findSafeUnopened();
    const result = claim(sx, sy, 'agent').result as { ok: boolean; result: string };
    expect(result.ok).toBe(true);
    expect(result.result).toBe('wrong');
    expect(S.turn).toBe('human');
    expect(S.round.agent).toBe(0);
  });
});

describe('soloReveal', () => {
  it('ends the game with a loss when a mine is opened', () => {
    soloReveal(0, 0);
    const [mx, my] = findMine();
    soloReveal(mx, my);
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('You lost');
  });

  it('wins the game once every mine-free cell is open', () => {
    soloReveal(0, 0);
    for (let y = 0; y < MS.h; y++)
      for (let x = 0; x < MS.w; x++) {
        const k = `${x},${y}`;
        if (!mines.has(k)) soloReveal(x, y);
      }
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('You won');
    expect(S.solo.msWins).toBe(1);
    expect(opened.size).toBe(MS.w * MS.h - MS.mines);
  });
});

describe('soloFlag', () => {
  it('toggles a flag and blocks opening a flagged cell', () => {
    soloFlag(2, 2);
    expect(flags.has('2,2')).toBe(true);
    soloReveal(2, 2);
    expect(opened.has('2,2')).toBe(false);
    soloFlag(2, 2);
    expect(flags.has('2,2')).toBe(false);
  });
});
