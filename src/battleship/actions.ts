import { S, other } from '../state';
import type { Player, ToolResult } from '../types';
import { BS, idx, inBoard, side, sunkAt, shipAt, fleetSunk, bumpSoloShots, soloShots } from './state';

export interface Shot {
  result: ToolResult;
  cell: number | null; // for the render to flash
}

/**
 * Fires one shot into `other(who)`'s waters.
 *
 * A hit keeps the turn, the way a correct ms_claim does. That is a pacing
 * decision as much as a rules one: it lets a well-aimed agent finish a wounded
 * ship in one visible burst of calls instead of one shot every other turn.
 */
export function fire(x: unknown, y: unknown, who: Player): Shot {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y))
    return { result: { ok: false, reason: `x and y must be whole numbers from 0 to ${BS.n - 1}` }, cell: null };
  if (!inBoard(x, y))
    return { result: { ok: false, reason: `off the grid — x and y both run 0 to ${BS.n - 1}` }, cell: null };

  const foe = other(who);
  const cell = idx(x, y);
  const waters = side[foe];
  if (waters.shotAt.has(cell))
    return { result: { ok: false, reason: 'you have already fired at that cell, pick another', your_turn: true }, cell: null };

  waters.shotAt.add(cell);
  const ship = shipAt(foe, cell);

  if (!ship) {
    if (S.duel) S.turn = foe;
    return {
      result: { ok: true, result: 'miss', x, y, your_turn: false, hint: 'a miss passes the turn' },
      cell,
    };
  }

  ship.hits++;
  const sunk = ship.hits >= ship.len;
  if (sunk) for (const c of ship.cells) sunkAt[foe].set(c, ship.len);

  if (fleetSunk(foe)) {
    S.over = true;
    S.round[who]++;
    S.series[who]++;
    S.verdict = who === 'human' ? 'You won the round' : 'Agent won';
    return {
      result: { ok: true, result: 'sunk', x, y, sunk_length: ship.len, fleet_destroyed: true, your_turn: false },
      cell,
    };
  }

  // Still your turn: a hit earns another shot.
  return {
    result: {
      ok: true,
      result: sunk ? 'sunk' : 'hit',
      x,
      y,
      ...(sunk ? { sunk_length: ship.len } : {}),
      your_turn: true,
      hint: 'a hit keeps your turn — fire again',
    },
    cell,
  };
}

/**
 * Single player: one hidden fleet, and the score is how few shots it takes.
 * No opponent exists here — not a bot, not the agent, nothing to mention.
 */
export function soloFire(x: number, y: number): Shot {
  const cell = idx(x, y);
  if (!inBoard(x, y) || side.agent.shotAt.has(cell)) return { result: { ok: false }, cell: null };

  side.agent.shotAt.add(cell);
  bumpSoloShots();
  const ship = shipAt('agent', cell);
  if (ship) {
    ship.hits++;
    if (ship.hits >= ship.len) for (const c of ship.cells) sunkAt.agent.set(c, ship.len);
  }
  if (fleetSunk('agent')) {
    S.over = true;
    S.verdict = `Fleet down in ${soloShots}`;
    if (!S.solo.bsBest || soloShots < S.solo.bsBest) S.solo.bsBest = soloShots;
  }
  return { result: { ok: true, result: ship ? 'hit' : 'miss' }, cell };
}
