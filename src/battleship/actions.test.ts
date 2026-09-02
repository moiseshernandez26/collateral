import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { BS, FLEET_CELLS, idx, xy, side, sunkAt, blank, placeFleet, shipAt, afloat, inBoard } from './state';
import { fire, soloFire } from './actions';

beforeEach(() => {
  blank();
  S.game = 'bs';
  S.duel = true;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0, bsBest: 0 };
});

/** Replaces a side's fleet with a known one, so tests aren't at the mercy of
 *  the random placement. */
function setFleet(who: 'human' | 'agent', ships: { len: number; cells: number[] }[]): void {
  side[who].ships = ships.map((s) => ({ ...s, hits: 0 }));
}

describe('placeFleet', () => {
  it('places the whole fleet inside the board without overlapping', () => {
    for (let i = 0; i < 200; i++) {
      const ships = placeFleet();
      expect(ships.map((s) => s.len).sort()).toEqual([...BS.fleet].sort());
      const all = ships.flatMap((s) => s.cells);
      expect(new Set(all).size).toBe(FLEET_CELLS);
      for (const c of all) {
        const [x, y] = xy(c);
        expect(inBoard(x, y)).toBe(true);
      }
    }
  });

  it('keeps ships in a straight line, one cell apart on the axis', () => {
    for (let i = 0; i < 100; i++)
      for (const s of placeFleet()) {
        const pts = s.cells.map(xy);
        const sameRow = pts.every(([, y]) => y === pts[0][1]);
        const sameCol = pts.every(([x]) => x === pts[0][0]);
        expect(sameRow || sameCol).toBe(true);
      }
  });

  // The targeting aid leans on this rule, and so does the human: two ships end
  // to end would be indistinguishable from one longer one.
  it('never lets two ships touch, not even diagonally', () => {
    for (let i = 0; i < 200; i++) {
      const ships = placeFleet();
      for (let a = 0; a < ships.length; a++)
        for (let b = a + 1; b < ships.length; b++)
          for (const p of ships[a].cells)
            for (const q of ships[b].cells) {
              const [px, py] = xy(p);
              const [qx, qy] = xy(q);
              expect(Math.abs(px - qx) > 1 || Math.abs(py - qy) > 1).toBe(true);
            }
    }
  });
});

describe('fire', () => {
  beforeEach(() => {
    setFleet('agent', [
      { len: 3, cells: [idx(0, 0), idx(1, 0), idx(2, 0)] },
      { len: 2, cells: [idx(4, 2), idx(4, 3)] },
      { len: 2, cells: [idx(0, 5), idx(1, 5)] },
    ]);
  });

  it('reports a miss and passes the turn', () => {
    const { result } = fire(3, 3, 'human');
    expect(result).toMatchObject({ ok: true, result: 'miss', your_turn: false });
    expect(S.turn).toBe('agent');
  });

  it('reports a hit and keeps the turn', () => {
    const { result } = fire(0, 0, 'human');
    expect(result).toMatchObject({ ok: true, result: 'hit', your_turn: true });
    expect(S.turn).toBe('human');
  });

  it('reports the sinking and the length of the ship', () => {
    fire(4, 2, 'human');
    const { result } = fire(4, 3, 'human');
    expect(result).toMatchObject({ ok: true, result: 'sunk', sunk_length: 2 });
    expect(sunkAt.agent.size).toBe(2);
  });

  it('rejects a repeat shot without passing the turn', () => {
    fire(3, 3, 'human'); // a miss, so it is the agent's turn now
    S.turn = 'human';
    const { result } = fire(3, 3, 'human');
    expect(result).toMatchObject({ ok: false });
    expect(S.turn).toBe('human');
  });

  it('rejects a shot off the grid, and anything that is not a whole number', () => {
    expect(fire(6, 0, 'human').result).toMatchObject({ ok: false });
    expect(fire(-1, 0, 'human').result).toMatchObject({ ok: false });
    expect(fire(1.5, 0, 'human').result).toMatchObject({ ok: false });
    expect(fire('2', 0, 'human').result).toMatchObject({ ok: false });
  });

  it('ends the round when the last cell of the last ship goes down', () => {
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [4, 2],
      [4, 3],
      [0, 5],
    ] as const)
      fire(x, y, 'human');
    expect(S.over).toBe(false);
    const { result } = fire(1, 5, 'human');
    expect(result).toMatchObject({ fleet_destroyed: true });
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('You won the round');
    expect(S.series.human).toBe(1);
  });
});

describe('single player', () => {
  beforeEach(() => {
    S.duel = false;
  });

  it('counts shots and records the best sweep', () => {
    const cells = side.agent.ships.flatMap((s) => s.cells);
    let shots = 0;
    for (const c of cells) {
      const [x, y] = xy(c);
      soloFire(x, y);
      shots++;
    }
    expect(S.over).toBe(true);
    expect(S.solo.bsBest).toBe(shots);
    expect(S.verdict).toContain(String(shots));
  });

  it('keeps the better of two sweeps', () => {
    S.solo.bsBest = 9;
    for (const c of side.agent.ships.flatMap((s) => s.cells)) soloFire(...xy(c));
    expect(S.solo.bsBest).toBe(Math.min(9, FLEET_CELLS));
  });
});

describe('fleet bookkeeping', () => {
  it('drops a ship off the afloat list only once every cell is hit', () => {
    setFleet('agent', [{ len: 3, cells: [idx(0, 0), idx(1, 0), idx(2, 0)] }]);
    expect(afloat('agent')).toEqual([3]);
    fire(0, 0, 'human');
    fire(1, 0, 'human');
    expect(afloat('agent')).toEqual([3]);
    fire(2, 0, 'human');
    expect(afloat('agent')).toEqual([]);
  });

  it('finds the ship sitting on a cell, and nothing on an empty one', () => {
    setFleet('agent', [{ len: 2, cells: [idx(3, 3), idx(3, 4)] }]);
    expect(shipAt('agent', idx(3, 3))?.len).toBe(2);
    expect(shipAt('agent', idx(0, 0))).toBeUndefined();
  });
});
