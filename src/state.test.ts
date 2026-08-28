import { describe, it, expect } from 'vitest';
import { S, other, esc, agentMayAct } from './state';

describe('other', () => {
  it('flips between human and agent', () => {
    expect(other('human')).toBe('agent');
    expect(other('agent')).toBe('human');
  });
});

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;');
  });

  it('stringifies non-string input', () => {
    expect(esc(42)).toBe('42');
  });
});

describe('agentMayAct', () => {
  it('is false outside a duel', () => {
    S.duel = false;
    S.over = false;
    S.turn = 'agent';
    expect(agentMayAct()).toBe(false);
  });

  it('is false when the round is over', () => {
    S.duel = true;
    S.over = true;
    S.turn = 'agent';
    expect(agentMayAct()).toBe(false);
  });

  it('is false when it is the human\'s turn', () => {
    S.duel = true;
    S.over = false;
    S.turn = 'human';
    expect(agentMayAct()).toBe(false);
  });

  it('is true only during a live duel on the agent\'s turn', () => {
    S.duel = true;
    S.over = false;
    S.turn = 'agent';
    expect(agentMayAct()).toBe(true);
  });
});
