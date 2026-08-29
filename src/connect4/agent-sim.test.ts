// Task 4.3: with no real agent attached, this simulates one using only what
// c4_analysis hands out and plays full duel games with it — the same claim
// design.md makes about the tool ("plays well without knowing anything about
// Connect 4"). generatePuzzle() is solo-only (see controller.ts's
// `S.duel ? c4Blank() : generatePuzzle()`), so this drives a real alternating
// duel instead of the one-shot puzzle.
import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { C4, blank } from './state';
import { drop } from './actions';
import { analysis } from './query';
import type { Player } from '../types';

beforeEach(() => {
  blank();
  S.over = false;
  S.verdict = '';
  S.series = { human: 0, agent: 0 };
  S.turn = 'human';
});

function pick(who: Player): number {
  const a = analysis(who);
  if (a.winning_now.length) return a.winning_now[0];
  const safe = a.legal_columns.filter((c) => !a.gives_opponent_a_win.includes(c));
  const pool = a.must_block.length ? a.must_block : safe.length ? safe : a.legal_columns;
  return pool[Math.floor(Math.random() * pool.length)];
}

describe('an agent that only ever acts on c4_analysis', () => {
  it('takes every immediate win it is offered, across many full duel games', () => {
    for (let game = 0; game < 40; game++) {
      blank();
      S.over = false;
      S.turn = 'human';
      let turns = 0;
      while (!S.over && turns < C4.w * C4.h) {
        turns++;
        const who = S.turn;
        const before = analysis(who);
        const col = before.winning_now.length ? before.winning_now[0] : pick(who);
        const r = drop(col, who).result as { ok: boolean; win: boolean };
        expect(r.ok).toBe(true);
        if (before.winning_now.length) expect(r.win).toBe(true);
      }
      expect(turns).toBeLessThanOrEqual(C4.w * C4.h);
    }
  });
});
