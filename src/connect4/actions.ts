import { S, other, agentMayAct } from '../state';
import type { Player, ToolResult } from '../types';
import { C4, cells, blank, freeRow, checkLine, anyLine, setWinLine, setMsg } from './state';

export function drop(col: number, who: Player): { result: ToolResult; drop?: [number, number] } {
  if (S.over) return { result: { ok: false, reason: 'the round is already over' } };
  if (!Number.isInteger(col) || col < 0 || col >= C4.w)
    return { result: { ok: false, reason: 'column out of range, 0 to 5' } };
  const row = freeRow(col);
  if (row === -1) return { result: { ok: false, reason: 'that column is full' } };
  cells[row][col] = who;
  const line = checkLine(row, col, who);
  if (line) {
    setWinLine(line);
    S.over = true;
    S.series[who]++;
    S.verdict = who === 'human' ? 'You won the round' : 'Agent won';
  } else if (cells[0].every(Boolean)) {
    S.over = true;
    S.verdict = 'Round tied';
  } else {
    S.turn = other(who);
  }
  return {
    result: { ok: true, row, column: col, win: !!line, round_over: S.over, your_turn: agentMayAct() },
    drop: [row, col],
  };
}

// One-shot puzzle: three of the player's pieces already on a line, one open slot wins it.
export function generatePuzzle(): void {
  const DIRS: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let attempt = 0; attempt < 800; attempt++) {
    blank();
    const [dr, dc] = DIRS[Math.floor(Math.random() * 4)];
    const r0 = Math.floor(Math.random() * C4.h);
    const c0 = Math.floor(Math.random() * C4.w);
    const line: [number, number][] = [
      [r0, c0],
      [r0 + dr, c0 + dc],
      [r0 + 2 * dr, c0 + 2 * dc],
      [r0 + 3 * dr, c0 + 3 * dc],
    ];
    if (line.some(([y, x]) => y < 0 || y >= C4.h || x < 0 || x >= C4.w)) continue;
    const t = Math.floor(Math.random() * 4);
    const [ty, tx] = line[t];

    // three of the player's own pieces on the line, except the target cell
    const need = new Map<number, number>(); // column -> highest occupied row
    line.forEach(([y, x], i) => {
      if (i === t) return;
      cells[y][x] = 'human';
      need.set(x, Math.min(need.has(x) ? need.get(x)! : C4.h, y));
    });
    // the target cell must stay empty and be the lowest free slot in its column
    if (cells[ty][tx]) continue;
    if (need.has(tx) && need.get(tx)! <= ty) continue;
    need.set(tx, Math.min(need.has(tx) ? need.get(tx)! : C4.h, ty + 1));

    // fill supporting cells under gravity
    for (const [x, top] of need) {
      for (let y = C4.h - 1; y > top; y--) {
        if (cells[y][x]) continue;
        cells[y][x] = Math.random() < 0.5 ? 'agent' : 'human';
      }
    }
    // chaff: stack a few random extra pieces in every other column so the
    // winning line isn't the only thing on an otherwise-empty board
    for (let x = 0; x < C4.w; x++) {
      if (x === tx) continue;
      const extra = 1 + Math.floor(Math.random() * 4); // 1-4, every column gets some cover
      for (let i = 0; i < extra; i++) {
        const y = freeRow(x);
        if (y === -1) break;
        cells[y][x] = Math.random() < 0.5 ? 'agent' : 'human';
      }
    }
    // target column: everything below is filled, nothing above
    let bad = false;
    for (let y = ty - 1; y >= 0; y--)
      if (cells[y][tx]) {
        bad = true;
        break;
      }
    if (bad) continue;
    if (ty < C4.h - 1 && !cells[ty + 1][tx]) continue;
    if (freeRow(tx) !== ty) continue;
    if (anyLine()) continue;

    // verify that shot actually wins
    cells[ty][tx] = 'human';
    const ok = !!checkLine(ty, tx, 'human');
    cells[ty][tx] = null;
    if (!ok) continue;

    // and that the chaff didn't hand out a second winning column
    let unique = true;
    for (let x = 0; x < C4.w; x++) {
      if (x === tx) continue;
      const row = freeRow(x);
      if (row === -1) continue;
      cells[row][x] = 'human';
      const wins = !!checkLine(row, x, 'human');
      cells[row][x] = null;
      if (wins) {
        unique = false;
        break;
      }
    }
    if (!unique) continue;

    setMsg('Find the column that makes four in a row.');
    return;
  }
  blank();
  const bottom = C4.h - 1;
  cells[bottom][0] = 'human';
  cells[bottom][1] = 'human';
  cells[bottom][2] = 'human';
  cells[bottom][C4.w - 1] = 'agent';
  setMsg('Find the column that makes four in a row.');
}

export function soloTry(col: number): { drop?: [number, number] } {
  if (S.over) return {};
  const row = freeRow(col);
  if (row === -1) {
    setMsg('That column is full.');
    return {};
  }
  cells[row][col] = 'human';
  const line = checkLine(row, col, 'human');
  if (line) {
    setWinLine(line);
    S.over = true;
    S.verdict = 'Solved!';
    S.solo.c4Solved++;
    return { drop: [row, col] };
  }
  cells[row][col] = null;
  setMsg("That doesn't win. Try another column.");
  return {};
}
