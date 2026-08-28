import { S } from '../state';
import type { Player } from '../types';

export const MS = { w: 9, h: 9, mines: 13 };

export interface TakenCell {
  by: Player;
  boom: boolean;
}

export let mines: Set<string>;
export let opened: Set<string>;
export let taken: Map<string, TakenCell>;
export let flags: Set<string>;
export let fresh: boolean;
export let claimMode = false;
export let flagMode = false;
export let lost = false;
export let count: number[][];

export const key = (x: number, y: number): string => x + ',' + y;
export const inBounds = (x: number, y: number): boolean => x >= 0 && x < MS.w && y >= 0 && y < MS.h;

export function neighbors(x: number, y: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (inBounds(x + dx, y + dy)) out.push([x + dx, y + dy]);
    }
  return out;
}

export function newBoard(): void {
  mines = new Set();
  opened = new Set();
  taken = new Map();
  flags = new Set();
  fresh = true;
  claimMode = false;
  flagMode = false;
  lost = false;
  count = Array.from({ length: MS.h }, () => new Array(MS.w).fill(0));
}

export function placeMines(sx: number, sy: number): void {
  const ban = new Set([key(sx, sy), ...neighbors(sx, sy).map(([x, y]) => key(x, y))]);
  let n = 0;
  while (n < MS.mines) {
    const x = Math.floor(Math.random() * MS.w);
    const y = Math.floor(Math.random() * MS.h);
    const k = key(x, y);
    if (mines.has(k) || ban.has(k)) continue;
    mines.add(k);
    n++;
  }
  for (let y = 0; y < MS.h; y++)
    for (let x = 0; x < MS.w; x++)
      count[y][x] = neighbors(x, y).filter(([a, b]) => mines.has(key(a, b))).length;
  fresh = false;
}

export const minesLeft = (): number => (S.duel ? MS.mines - taken.size : MS.mines - flags.size);

export function toggleClaimMode(): void {
  claimMode = !claimMode;
}
export function setClaimMode(v: boolean): void {
  claimMode = v;
}
export function toggleFlagMode(): void {
  flagMode = !flagMode;
}
export function setLost(v: boolean): void {
  lost = v;
}
