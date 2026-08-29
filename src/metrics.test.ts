import { describe, it, expect, beforeEach } from 'vitest';
import { metrics, recordCall, resetRoundMetrics, resetMatchMetrics } from './metrics';

beforeEach(() => {
  resetMatchMetrics();
});

describe('recordCall', () => {
  it('counts a successful call toward calls and callsThisRound only', () => {
    recordCall([]);
    expect(metrics.calls).toBe(1);
    expect(metrics.callsThisRound).toBe(1);
    expect(metrics.rejections).toBe(0);
    expect(metrics.badMoves).toBe(0);
  });

  it('counts an ok:false result as a rejection, not a bad move', () => {
    recordCall({ ok: false, reason: "it's not your turn" });
    expect(metrics.rejections).toBe(1);
    expect(metrics.badMoves).toBe(0);
  });

  it('counts a wrong claim as a bad move', () => {
    recordCall({ ok: true, result: 'wrong' });
    expect(metrics.badMoves).toBe(1);
    expect(metrics.rejections).toBe(0);
  });

  it('counts opening a mine as a bad move', () => {
    recordCall({ ok: true, result: 'mine', point_for: 'human' });
    expect(metrics.badMoves).toBe(1);
  });

  it('does not count a normal successful drop as a bad move', () => {
    recordCall({ ok: true, row: 4, column: 2, win: false });
    expect(metrics.badMoves).toBe(0);
    expect(metrics.rejections).toBe(0);
  });

  it('ignores a plain string result, as the _board tools return', () => {
    recordCall('? ? ?\n. . .');
    expect(metrics.calls).toBe(1);
    expect(metrics.rejections).toBe(0);
    expect(metrics.badMoves).toBe(0);
  });
});

describe('resetRoundMetrics', () => {
  it('zeroes callsThisRound but keeps the match totals', () => {
    recordCall([]);
    recordCall({ ok: false, reason: 'nope' });
    resetRoundMetrics();
    expect(metrics.callsThisRound).toBe(0);
    expect(metrics.calls).toBe(2);
    expect(metrics.rejections).toBe(1);
  });
});

describe('resetMatchMetrics', () => {
  it('clears every counter', () => {
    recordCall([]);
    resetMatchMetrics();
    expect(metrics).toEqual({ calls: 0, callsThisRound: 0, rejections: 0, badMoves: 0 });
  });
});
