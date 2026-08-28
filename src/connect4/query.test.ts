import { describe, it, expect, beforeEach } from 'vitest';
import { C4, cells, blank } from './state';
import { analysis, boardText } from './query';

beforeEach(() => {
  blank();
});

const bottom = C4.h - 1;

describe('analysis', () => {
  it('finds an immediate win for the requested player', () => {
    cells[bottom][0] = 'agent';
    cells[bottom][1] = 'agent';
    cells[bottom][2] = 'agent';
    const a = analysis('agent');
    expect(a.winning_now).toContain(3);
    expect(a.legal_columns.length).toBe(C4.w);
  });

  it('flags a column the opponent must block', () => {
    cells[bottom][0] = 'human';
    cells[bottom][1] = 'human';
    cells[bottom][2] = 'human';
    const a = analysis('agent');
    expect(a.must_block).toContain(3);
    expect(a.winning_now).not.toContain(3);
  });
});

describe('boardText', () => {
  it('renders pieces and a column-number footer', () => {
    cells[bottom][0] = 'human';
    cells[bottom][1] = 'agent';
    const text = boardText();
    expect(text).toContain('H A . . . .');
    expect(text).toContain('0 1 2 3 4 5');
  });
});
