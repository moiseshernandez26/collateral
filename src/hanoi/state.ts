import type { Player } from '../types';

// Five discs: 31 moves at best. That number is the whole design. At three or
// four the race is decided by how fast someone can click, and the room learns
// only that a tool call costs a round-trip. At five, knowing the recursion is
// worth more than typing speed, so the agent wins for the right reason — and
// 31 calls landing one after another in the rail is the demo's second moment.
export const HANOI = { discs: 5, pegs: 3 };
export const OPTIMAL = 2 ** HANOI.discs - 1;

/** Each peg is a stack, biggest disc first. A disc *is* its size. */
export type Pegs = number[][];

export let peg: Record<Player, Pegs>;
export let moves: Record<Player, number>;
let finishedAt: Record<Player, number | null>;
export let startedAt: number | null; // one clock for the whole race
export let picked: number | null; // the peg the human has selected as a source

export const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const fresh = (): Pegs => [Array.from({ length: HANOI.discs }, (_, i) => HANOI.discs - i), [], []];

export function blank(): void {
  peg = { human: fresh(), agent: fresh() };
  moves = { human: 0, agent: 0 };
  finishedAt = { human: null, agent: null };
  startedAt = null;
  picked = null;
}

export function startClock(): void {
  if (startedAt === null) startedAt = now();
}

export function setPicked(p: number | null): void {
  picked = p;
}

export function bumpMoves(who: Player): void {
  moves[who]++;
}

export function markFinished(who: Player): void {
  finishedAt[who] = now();
}

/** Milliseconds since the race began — from timestamps, never from counting
 *  ticks, so a throttled background tab can slow the display but never the
 *  clock itself. */
export const elapsed = (): number => (startedAt === null ? 0 : now() - startedAt);

export const elapsedFor = (who: Player): number =>
  startedAt === null ? 0 : (finishedAt[who] ?? now()) - startedAt;

export const solved = (who: Player): boolean => peg[who][HANOI.pegs - 1].length === HANOI.discs;

const topOf = (who: Player, p: number): number | undefined => peg[who][p][peg[who][p].length - 1];

/** A move is legal when the source has a disc and the destination's top disc
 *  is bigger. That is the entire game. */
export function canMove(who: Player, from: number, to: number): boolean {
  if (from === to) return false;
  if (from < 0 || to < 0 || from >= HANOI.pegs || to >= HANOI.pegs) return false;
  const disc = topOf(who, from);
  if (disc === undefined) return false;
  const onto = topOf(who, to);
  return onto === undefined || onto > disc;
}

export const legalMoves = (who: Player): { from: number; to: number }[] => {
  const out: { from: number; to: number }[] = [];
  for (let from = 0; from < HANOI.pegs; from++)
    for (let to = 0; to < HANOI.pegs; to++) if (canMove(who, from, to)) out.push({ from, to });
  return out;
};

export const fmt = (ms: number): string => (ms / 1000).toFixed(1) + 's';

/** "1 move", "2 moves". Lives here because the tool text and the on-screen
 *  clock both count moves, and they each got the plural wrong separately. */
export const plural = (n: number): string => `${n} move${n === 1 ? '' : 's'}`;
