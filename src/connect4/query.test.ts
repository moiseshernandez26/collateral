import { describe, it, expect, beforeEach } from 'vitest';
import { cells, blank } from './state';
import { analysis, boardText } from './query';

beforeEach(() => {
  blank();
});

describe('analysis', () => {
  it('finds an immediate win for the requested player', () => {
    cells[5][0] = 'agent';
    cells[5][1] = 'agent';
    cells[5][2] = 'agent';
    const a = analysis('agent');
    expect(a.winning_now).toContain(3);
    expect(a.legal_columns.length).toBe(7);
  });

  it('flags a column the opponent must block', () => {
    cells[5][0] = 'human';
    cells[5][1] = 'human';
    cells[5][2] = 'human';
    const a = analysis('agent');
    expect(a.must_block).toContain(3);
    expect(a.winning_now).not.toContain(3);
  });
});

describe('boardText', () => {
  it('renders pieces and a column-number footer', () => {
    cells[5][0] = 'human';
    cells[5][1] = 'agent';
    const text = boardText();
    expect(text).toContain('H A . . . . .');
    expect(text).toContain('0 1 2 3 4 5 6');
  });
});
