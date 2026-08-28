import type { Player } from '../types';

export const C4 = { w: 6, h: 5 };

export let cells: (Player | null)[][];
export let winLine: [number, number][] = [];
export let msg = '';

export function blank(): void {
  cells = Array.from({ length: C4.h }, () => new Array(C4.w).fill(null));
  winLine = [];
  msg = '';
}

export function setMsg(text: string): void {
  msg = text;
}

export const freeRow = (col: number): number => {
  for (let y = C4.h - 1; y >= 0; y--) if (!cells[y][col]) return y;
  return -1;
};

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function checkLine(r: number, c: number, who: Player): [number, number][] | null {
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [[r, c]];
    for (const s of [1, -1]) {
      let y = r + dr * s;
      let x = c + dc * s;
      while (y >= 0 && y < C4.h && x >= 0 && x < C4.w && cells[y][x] === who) {
        line.push([y, x]);
        y += dr * s;
        x += dc * s;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

export function anyLine(): boolean {
  for (let y = 0; y < C4.h; y++)
    for (let x = 0; x < C4.w; x++) if (cells[y][x] && checkLine(y, x, cells[y][x]!)) return true;
  return false;
}

export function setWinLine(line: [number, number][]): void {
  winLine = line;
}
