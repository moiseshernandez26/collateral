import type { Player } from '../types';

// 6x6 with a 3 and two 2s — seven cells of fleet. Small on purpose: a full-size
// battleship game is far too slow to watch, and the point being demonstrated
// here is the information boundary, not the length of the hunt.
export const BS = { n: 6, fleet: [3, 2, 2] as const };
export const FLEET_CELLS = BS.fleet.reduce((a, b) => a + b, 0);

export interface Ship {
  len: number;
  cells: number[]; // flat indices, y * n + x
  hits: number;
}

/** One side's own waters: its fleet, and the shots the *opponent* has fired. */
export interface Side {
  ships: Ship[];
  shotAt: Set<number>; // cells the opponent has fired at
}

export const idx = (x: number, y: number): number => y * BS.n + x;
export const xy = (i: number): [number, number] => [i % BS.n, Math.floor(i / BS.n)];
export const inBoard = (x: number, y: number): boolean => x >= 0 && x < BS.n && y >= 0 && y < BS.n;

export let side: Record<Player, Side>;
export let sunkAt: Record<Player, Map<number, number>>; // cell -> length of the ship sunk there
export let soloShots = 0;
export let showMap = false; // draw the agent's own targeting map over the board

/**
 * Places the fleet at random. Ships may not overlap or touch, not even
 * diagonally — a fleet packed shoulder to shoulder makes the targeting aid
 * nearly useless and the game a coin flip.
 */
export function placeFleet(): Ship[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const ships: Ship[] = [];
    const blocked = new Set<number>();
    let ok = true;

    for (const len of BS.fleet) {
      let placed: Ship | null = null;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const horizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (horizontal ? BS.n - len + 1 : BS.n));
        const y = Math.floor(Math.random() * (horizontal ? BS.n : BS.n - len + 1));
        const cells: number[] = [];
        for (let k = 0; k < len; k++) cells.push(idx(x + (horizontal ? k : 0), y + (horizontal ? 0 : k)));
        if (cells.some((c) => blocked.has(c))) continue;
        placed = { len, cells, hits: 0 };
      }
      if (!placed) {
        ok = false;
        break;
      }
      ships.push(placed);
      for (const c of placed.cells) {
        const [cx, cy] = xy(c);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if (inBoard(cx + dx, cy + dy)) blocked.add(idx(cx + dx, cy + dy));
      }
    }
    if (ok) return ships;
  }
  // 500 attempts without a legal fleet on a 6x6 is not a thing that happens,
  // but a game that can't start is worse than a fleet in a known spot.
  return [
    { len: 3, cells: [idx(0, 0), idx(1, 0), idx(2, 0)], hits: 0 },
    { len: 2, cells: [idx(0, 2), idx(0, 3)], hits: 0 },
    { len: 2, cells: [idx(4, 4), idx(5, 4)], hits: 0 },
  ];
}

export function blank(): void {
  side = {
    human: { ships: placeFleet(), shotAt: new Set() },
    agent: { ships: placeFleet(), shotAt: new Set() },
  };
  sunkAt = { human: new Map(), agent: new Map() };
  soloShots = 0;
  showMap = false;
}

export function toggleMap(): void {
  showMap = !showMap;
}

export function bumpSoloShots(): void {
  soloShots++;
}

/** The ship occupying a cell of `who`'s own waters, if any. */
export const shipAt = (who: Player, cell: number): Ship | undefined =>
  side[who].ships.find((s) => s.cells.includes(cell));

export const fleetSunk = (who: Player): boolean => side[who].ships.every((s) => s.hits >= s.len);

/** Lengths of `who`'s ships still afloat — what the *opponent* is hunting. */
export const afloat = (who: Player): number[] => side[who].ships.filter((s) => s.hits < s.len).map((s) => s.len);
