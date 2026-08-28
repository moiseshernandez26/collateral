import { MS, opened, taken, count, key, neighbors } from './state';

export interface FrontierEntry {
  cell: string;
  value: number;
  already_found: number;
  remaining: number;
  unknown: string[];
}

export function frontier(): FrontierEntry[] {
  const out: FrontierEntry[] = [];
  for (let y = 0; y < MS.h; y++)
    for (let x = 0; x < MS.w; x++) {
      const k = key(x, y);
      if (!opened.has(k)) continue;
      const v = count[y][x];
      if (!v) continue;
      const unknown: string[] = [];
      const found: string[] = [];
      for (const [nx, ny] of neighbors(x, y)) {
        const nk = key(nx, ny);
        if (taken.has(nk)) found.push(nk);
        else if (!opened.has(nk)) unknown.push(nk);
      }
      if (unknown.length)
        out.push({ cell: k, value: v, already_found: found.length, remaining: v - found.length, unknown });
    }
  return out;
}

export function boardText(): string {
  let s = '    ' + Array.from({ length: MS.w }, (_, x) => x).join(' ') + '\n';
  for (let y = 0; y < MS.h; y++) {
    s += y + '   ';
    const row: string[] = [];
    for (let x = 0; x < MS.w; x++) {
      const k = key(x, y);
      if (taken.has(k)) row.push(taken.get(k)!.by === 'human' ? 'H' : 'A');
      else if (!opened.has(k)) row.push('?');
      else row.push(String(count[y][x] || '.'));
    }
    s += row.join(' ') + '\n';
  }
  return s;
}
