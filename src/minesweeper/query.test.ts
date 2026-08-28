import { describe, it, expect, beforeEach } from 'vitest';
import { newBoard, MS } from './state';
import { reveal } from './actions';
import { frontier, boardText } from './query';

beforeEach(() => {
  newBoard();
  reveal(0, 0, 'human');
});

describe('frontier', () => {
  it('reports remaining counts consistent with already_found and unknown', () => {
    const entries = frontier();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.already_found).toBe(0); // nothing claimed yet
      expect(e.remaining).toBe(e.value);
      expect(e.unknown.length).toBeGreaterThan(0);
      expect(e.remaining).toBeLessThanOrEqual(e.unknown.length);
    }
  });
});

describe('boardText', () => {
  it('renders a header row and one row per board row', () => {
    const text = boardText();
    const lines = text.trim().split('\n');
    expect(lines.length).toBe(MS.h + 1);
    expect(lines[0]).toContain('0 1 2 3 4 5 6 7 8');
    expect(text).toContain('?'); // unopened cells remain
  });
});
