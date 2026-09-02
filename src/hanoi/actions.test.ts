import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { HANOI, OPTIMAL, peg, moves, blank, canMove, legalMoves, solved, startedAt, elapsedFor } from './state';
import { move, beginRace } from './actions';
import { snapshot, movesText } from './query';

beforeEach(() => {
  blank();
  S.game = 'hanoi';
  S.duel = true;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0, hanoiBest: 0 };
  beginRace();
});

/** The recursive solution, as a list of moves — the thing the agent has to work
 *  out for itself and the tests are allowed to know. */
function solution(n: number, from = 0, to = HANOI.pegs - 1, via = 1): [number, number][] {
  if (n === 0) return [];
  return [...solution(n - 1, from, via, to), [from, to] as [number, number], ...solution(n - 1, via, to, from)];
}

describe('the rules', () => {
  it('starts with every disc stacked on peg 0, biggest at the bottom', () => {
    expect(peg.human[0]).toEqual([5, 4, 3, 2, 1]);
    expect(peg.human[1]).toEqual([]);
    expect(peg.human[2]).toEqual([]);
  });

  it('moves the top disc and nothing else', () => {
    const r = move(0, 2, 'human');
    expect(r).toMatchObject({ ok: true, moved: { disc: 1, from: 0, to: 2 } });
    expect(peg.human[0]).toEqual([5, 4, 3, 2]);
    expect(peg.human[2]).toEqual([1]);
  });

  it('refuses to put a bigger disc on a smaller one, and says why', () => {
    move(0, 2, 'human'); // disc 1 to peg 2
    const r = move(0, 2, 'human') as { ok: boolean; reason: string };
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('bigger');
    expect(peg.human[2]).toEqual([1]); // untouched
  });

  it('refuses an empty peg, the same peg twice, and a peg that does not exist', () => {
    expect(move(1, 0, 'human')).toMatchObject({ ok: false, reason: expect.stringContaining('empty') });
    expect(move(0, 0, 'human')).toMatchObject({ ok: false });
    expect(move(0, 7, 'human')).toMatchObject({ ok: false });
    expect(move('left', 2, 'human')).toMatchObject({ ok: false });
  });

  it('counts a rejected move as no move at all', () => {
    move(1, 0, 'human');
    expect(moves.human).toBe(0);
  });

  it('lists exactly the moves that canMove agrees with', () => {
    move(0, 2, 'human');
    for (let f = 0; f < HANOI.pegs; f++)
      for (let t = 0; t < HANOI.pegs; t++) {
        const listed = legalMoves('human').some((m) => m.from === f && m.to === t);
        expect(listed).toBe(canMove('human', f, t));
      }
  });
});

describe('the race', () => {
  it('will not move a disc before the clock has started', () => {
    blank();
    S.over = false;
    expect(move(0, 2, 'human')).toMatchObject({ ok: false, reason: expect.stringContaining('hanoi_ready') });
    expect(startedAt).toBeNull();
  });

  it('runs one clock for both sides', () => {
    expect(startedAt).not.toBeNull();
    expect(elapsedFor('human')).toBeGreaterThanOrEqual(0);
    expect(elapsedFor('agent')).toBeGreaterThanOrEqual(0);
  });

  it('lets both sides move at once, with no turn to be out of', () => {
    expect(move(0, 2, 'human')).toMatchObject({ ok: true });
    expect(move(0, 2, 'agent')).toMatchObject({ ok: true });
    expect(move(0, 1, 'human')).toMatchObject({ ok: true });
    expect(moves).toEqual({ human: 2, agent: 1 });
  });

  it('gives the round to whoever finishes first', () => {
    for (const [f, t] of solution(HANOI.discs)) move(f, t, 'agent');
    expect(solved('agent')).toBe(true);
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('Agent won the race');
    expect(S.series.agent).toBe(1);
    expect(moves.agent).toBe(OPTIMAL);
  });

  it('stops the loser mid-tower rather than letting them finish afterwards', () => {
    for (const [f, t] of solution(HANOI.discs)) move(f, t, 'human');
    expect(S.over).toBe(true);
    expect(move(0, 2, 'agent')).toMatchObject({ ok: false, reason: 'the race is already over' });
  });

  it('reports the winner their time and how close to optimal they were', () => {
    const seq = solution(HANOI.discs);
    let last: unknown;
    for (const [f, t] of seq) last = move(f, t, 'agent');
    expect(last).toMatchObject({ solved: true, moves_taken: OPTIMAL, optimal: OPTIMAL });
  });
});

describe('single player', () => {
  beforeEach(() => {
    blank();
    S.duel = false;
    S.over = false;
  });

  it('needs no ready call — the clock starts on the first move', () => {
    expect(startedAt).toBeNull();
    expect(move(0, 2, 'human')).toMatchObject({ ok: true });
    expect(startedAt).not.toBeNull();
  });

  it('records the time and keeps the better of two runs', () => {
    for (const [f, t] of solution(HANOI.discs)) move(f, t, 'human');
    expect(S.over).toBe(true);
    expect(S.verdict).toMatch(/Solved in/);
    // Kept in ms: a solve fast enough to round to 0 seconds would otherwise be
    // stored as 0, which every later check reads as "no time yet".
    expect(S.solo.hanoiBest).toBeGreaterThan(0);

    // A worse standing record gets beaten...
    S.solo.hanoiBest = 9999;
    blank();
    S.over = false;
    for (const [f, t] of solution(HANOI.discs)) move(f, t, 'human');
    expect(S.solo.hanoiBest).toBeLessThan(9999);

    // ...and one that can't be beaten survives. (1ms is the floor a solve can
    // record, so nothing later is strictly faster.)
    S.solo.hanoiBest = 1;
    blank();
    S.over = false;
    for (const [f, t] of solution(HANOI.discs)) move(f, t, 'human');
    expect(S.solo.hanoiBest).toBe(1);
  });
});

describe('what the agent is told', () => {
  it('hands over the legal moves and never the good one', () => {
    const text = movesText('agent');
    expect(text).toContain('legal moves right now');
    expect(text).toMatch(/not the good ones/);
    // 5 discs on one peg: only the small disc can move, to either other peg
    expect(snapshot('agent').legal_moves).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 2 },
    ]);
  });

  it('reports its own position, the optimal count and the clock', () => {
    const s = snapshot('agent');
    expect(s.your_pegs[0]).toEqual([5, 4, 3, 2, 1]);
    expect(s.optimal_total).toBe(OPTIMAL);
    expect(s.race_started).toBe(true);
    expect(s.elapsed).toMatch(/^\d+\.\ds$/);
  });

  // Knowing you are behind is part of a race, and both towers are on screen
  // anyway. The arrangement stays theirs to work out.
  it('shows how many moves the other side has made, but not their tower', () => {
    move(0, 2, 'human');
    move(0, 1, 'human');
    const s = snapshot('agent') as unknown as Record<string, unknown>;
    expect(s.opponent_moves).toBe(2);
    expect(JSON.stringify(s)).not.toContain('opponent_pegs');
  });
});
