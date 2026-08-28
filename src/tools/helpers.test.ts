import { describe, it, expect, vi } from 'vitest';
import { S } from '../state';
import { wrapText, guard, NOT_TURN } from './helpers';

describe('wrapText', () => {
  it('passes strings through untouched', () => {
    expect(wrapText('hello')).toEqual({ content: [{ type: 'text', text: 'hello' }] });
  });

  it('JSON-stringifies non-string values', () => {
    expect(wrapText({ ok: true })).toEqual({ content: [{ type: 'text', text: '{"ok":true}' }] });
  });
});

describe('guard', () => {
  it('rejects with NOT_TURN when the agent may not act', () => {
    S.duel = false;
    S.over = false;
    S.turn = 'agent';
    const fn = vi.fn(() => ({ ok: true }));
    expect(guard(fn)({})).toEqual(NOT_TURN);
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls through when it is the agent\'s turn in a live duel', () => {
    S.duel = true;
    S.over = false;
    S.turn = 'agent';
    const fn = vi.fn((args: Record<string, unknown>) => ({ ok: true, ...args }));
    expect(guard(fn)({ x: 1 })).toEqual({ ok: true, x: 1 });
    expect(fn).toHaveBeenCalledWith({ x: 1 });
  });
});
