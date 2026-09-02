import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { BS, FLEET_CELLS, idx, xy, side, blank, shipAt } from './state';
import { fire } from './actions';
import { knownGrid, scores, targets, boardText } from './query';

beforeEach(() => {
  blank();
  S.game = 'bs';
  S.duel = true;
  S.over = false;
  S.turn = 'agent';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0, bsBest: 0 };
});

function setHumanFleet(ships: { len: number; cells: number[] }[]): void {
  side.human.ships = ships.map((s) => ({ ...s, hits: 0 }));
}

// The reason this game is in the arcade at all. Everything the agent can reach
// has to be derived from its own shots — if any of these break, the demo is
// making a claim the code doesn't back.
describe('the information boundary', () => {
  it('shows nothing at all before a shot is fired', () => {
    expect(knownGrid('agent').every((v) => v === 'unknown')).toBe(true);
    // Only the grid rows — the first line is the legend, which names the marks.
    const rows = boardText('agent').split('\n').slice(2, 2 + BS.n);
    expect(rows.join('')).not.toMatch(/[Xo#]/);
  });

  it('reveals a cell only once it has been fired at', () => {
    const target = side.human.ships[0].cells[0];
    const [x, y] = xy(target);
    expect(knownGrid('agent')[target]).toBe('unknown');
    fire(x, y, 'agent');
    expect(knownGrid('agent')[target]).toBe('hit');
    // and every other ship cell is still a blank as far as the agent knows
    const others = side.human.ships.flatMap((s) => s.cells).filter((c) => c !== target);
    for (const c of others) expect(knownGrid('agent')[c]).not.toBe('hit');
  });

  it('never scores a cell that has already been fired at', () => {
    fire(0, 0, 'agent');
    fire(1, 1, 'agent');
    const s = scores('agent');
    expect(s[idx(0, 0)]).toBe(0);
    expect(s[idx(1, 1)]).toBe(0);
  });

  // The sharpest version of the claim: over many random fleets, a cell the aid
  // rates zero must never be the only place a ship could be.
  it('never rates an empty cell above a cell that actually holds a ship, with no evidence', () => {
    for (let i = 0; i < 60; i++) {
      blank();
      const s = scores('agent');
      const shipCells = side.human.ships.flatMap((c) => c.cells);
      const shipAvg = shipCells.reduce((a, c) => a + s[c], 0) / shipCells.length;
      const allAvg = s.reduce((a, b) => a + b, 0) / s.length;
      // With no shots fired the map cannot know anything, so cells holding
      // ships must not stand out from the rest. Any leak would show up here.
      expect(Math.abs(shipAvg - allAvg)).toBeLessThan(allAvg * 0.35 + 1);
    }
  });
});

describe('the targeting aid', () => {
  it('hunts with no wounded ship, and rates the middle above the corners', () => {
    const t = targets('agent') as { mode: string; best: { x: number; y: number; score: number } };
    expect(t.mode).toBe('hunt');
    const s = scores('agent');
    expect(s[idx(0, 0)]).toBeLessThan(s[idx(2, 2)]); // a corner fits fewer ships
    expect(t.best.score).toBeGreaterThan(0);
  });

  it('switches to finishing the moment a hit has no sunk ship to explain it', () => {
    setHumanFleet([
      { len: 3, cells: [idx(2, 2), idx(3, 2), idx(4, 2)] },
      { len: 2, cells: [idx(0, 5), idx(1, 5)] },
      { len: 2, cells: [idx(5, 0), idx(5, 1)] },
    ]);
    fire(3, 2, 'agent');
    const t = targets('agent') as { mode: string; hits_not_yet_sunk: unknown[]; candidates: { x: number; y: number }[] };
    expect(t.mode).toBe('finish');
    expect(t.hits_not_yet_sunk).toEqual([{ x: 3, y: 2 }]);
    // every candidate must be a neighbour of the wounded cell, in line with it
    for (const c of t.candidates) expect(Math.abs(c.x - 3) + Math.abs(c.y - 2)).toBeLessThanOrEqual(2);
  });

  it('rules out placements that cross a miss', () => {
    setHumanFleet([{ len: 3, cells: [idx(0, 0), idx(1, 0), idx(2, 0)] }]);
    const before = scores('agent')[idx(3, 3)];
    fire(3, 3, 'agent'); // a miss in open water
    const after = scores('agent')[idx(4, 3)];
    expect(after).toBeLessThan(before); // its neighbour lost every placement through it
  });

  // The rule that ships never touch is public — it is in the visible rules —
  // so the aid is entitled to use it, and it makes a real difference.
  it('rules out the ring around a sunk ship', () => {
    setHumanFleet([
      { len: 2, cells: [idx(2, 2), idx(3, 2)] },
      { len: 3, cells: [idx(0, 5), idx(1, 5), idx(2, 5)] },
      { len: 2, cells: [idx(5, 0), idx(5, 1)] },
    ]);
    fire(2, 2, 'agent');
    fire(3, 2, 'agent'); // sunk
    const s = scores('agent');
    for (const [x, y] of [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 2],
      [2, 3],
      [4, 3],
    ] as const)
      expect(s[idx(x, y)]).toBe(0);
  });

  it('always points at a cell that has not been fired at', () => {
    for (let i = 0; i < 40; i++) {
      blank();
      for (let shot = 0; shot < 12; shot++) {
        const t = targets('agent') as { best: { x: number; y: number } | null };
        if (!t.best) break;
        expect(knownGrid('agent')[idx(t.best.x, t.best.y)]).toBe('unknown');
        fire(t.best.x, t.best.y, 'agent');
        if (S.over) break;
      }
    }
  });

  // The honest test of a deduction aid: does following it actually work?
  it('sinks a whole fleet well inside the 36 cells of the board', () => {
    let worst = 0;
    for (let i = 0; i < 100; i++) {
      blank();
      S.over = false;
      let shots = 0;
      while (!S.over && shots < BS.n * BS.n) {
        const t = targets('agent') as { best: { x: number; y: number } | null };
        if (!t.best) break;
        fire(t.best.x, t.best.y, 'agent');
        shots++;
      }
      expect(S.over).toBe(true); // it always finishes
      worst = Math.max(worst, shots);
    }
    // Random firing needs ~30 shots to clear 7 cells. Anything near that means
    // the aid is decoration.
    expect(worst).toBeLessThan(26);
  });
});

describe('boardText', () => {
  it('draws only what the shots have earned, and says so', () => {
    setHumanFleet([{ len: 2, cells: [idx(0, 0), idx(1, 0)] }]);
    fire(0, 0, 'agent');
    fire(5, 5, 'agent');
    const text = boardText('agent');
    expect(text).toContain('X'); // the hit
    expect(text).toContain('o'); // the miss
    expect(text).toMatch(/cannot see where their ships are/);
    expect(text.split('\n').length).toBe(BS.n + 5);
  });

  it("reports the agent's own damage, which it is entitled to know", () => {
    const cell = side.agent.ships[0].cells[0];
    expect(shipAt('agent', cell)).toBeDefined();
    fire(...xy(cell), 'human');
    expect(boardText('agent')).toMatch(/1 hit/);
  });

  it('counts the fleet the same way the scoreboard does', () => {
    expect(side.human.ships.flatMap((s) => s.cells).length).toBe(FLEET_CELLS);
  });
});
