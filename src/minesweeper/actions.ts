import { S, other, agentMayAct } from '../state';
import type { Player, ToolResult } from '../types';
import {
  MS,
  mines,
  opened,
  taken,
  flags,
  fresh,
  count,
  key,
  inBounds,
  neighbors,
  placeMines,
  minesLeft,
  setLost,
} from './state';

function flood(x: number, y: number): string[] {
  const stack: [number, number][] = [[x, y]];
  const openedKeys: string[] = [];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const ck = key(cx, cy);
    if (opened.has(ck) || taken.has(ck) || flags.has(ck)) continue;
    opened.add(ck);
    openedKeys.push(ck);
    if (count[cy][cx] === 0) for (const [nx, ny] of neighbors(cx, cy)) stack.push([nx, ny]);
  }
  return openedKeys;
}

function finishDuel(): void {
  if (taken.size < MS.mines) return;
  S.over = true;
  const h = S.round.human;
  const a = S.round.agent;
  if (h === a) S.verdict = 'Round tied';
  else {
    const w: Player = h > a ? 'human' : 'agent';
    S.series[w]++;
    S.verdict = w === 'human' ? 'You won the round' : 'Agent won';
  }
}

export function reveal(x: number, y: number, who: Player): { result: ToolResult; openedKeys?: string[] } {
  if (S.over) return { result: { ok: false, reason: 'the round is already over' } };
  if (!Number.isInteger(x) || !Number.isInteger(y))
    return { result: { ok: false, reason: 'x and y must be integers' } };
  if (!inBounds(x, y)) return { result: { ok: false, reason: 'out of bounds, x and y range from 0 to 8' } };
  const k = key(x, y);
  if (opened.has(k)) return { result: { ok: false, reason: 'that cell is already open' } };
  if (taken.has(k)) return { result: { ok: false, reason: 'that cell was already claimed' } };
  if (fresh) placeMines(x, y);

  if (mines.has(k)) {
    const foe = other(who);
    taken.set(k, { by: foe, boom: true });
    S.round[foe]++;
    S.turn = foe;
    finishDuel();
    return {
      result: {
        ok: true,
        result: 'mine',
        point_for: foe,
        round_points: { ...S.round },
        mines_left: minesLeft(),
        round_over: S.over,
        your_turn: agentMayAct(),
      },
    };
  }
  const openedKeys = flood(x, y);
  S.turn = other(who);
  finishDuel();
  return {
    result: {
      ok: true,
      result: 'safe',
      value: count[y][x],
      opened: openedKeys.length,
      round_points: { ...S.round },
      mines_left: minesLeft(),
      round_over: S.over,
      your_turn: agentMayAct(),
    },
    openedKeys,
  };
}

export function claim(x: number, y: number, who: Player): { result: ToolResult } {
  if (S.over) return { result: { ok: false, reason: 'the round is already over' } };
  if (!Number.isInteger(x) || !Number.isInteger(y))
    return { result: { ok: false, reason: 'x and y must be integers' } };
  if (!inBounds(x, y)) return { result: { ok: false, reason: 'out of bounds, x and y range from 0 to 8' } };
  if (fresh) return { result: { ok: false, reason: 'the board has not been generated yet, open a cell first' } };
  const k = key(x, y);
  if (opened.has(k)) return { result: { ok: false, reason: 'that cell is open, it cannot have a mine' } };
  if (taken.has(k)) return { result: { ok: false, reason: 'that cell was already claimed' } };

  if (mines.has(k)) {
    taken.set(k, { by: who, boom: false });
    S.round[who]++;
    finishDuel();
    return {
      result: {
        ok: true,
        result: 'correct',
        point_for: who,
        keep_turn: !S.over,
        round_points: { ...S.round },
        mines_left: minesLeft(),
        round_over: S.over,
        your_turn: agentMayAct(),
      },
    };
  }
  S.turn = other(who);
  return {
    result: {
      ok: true,
      result: 'wrong',
      note: 'no mine there, you lose the turn',
      round_points: { ...S.round },
      mines_left: minesLeft(),
      your_turn: false,
    },
  };
}

export function soloReveal(x: number, y: number): { openedKeys?: string[] } {
  if (S.over) return {};
  const k = key(x, y);
  if (opened.has(k) || flags.has(k)) return {};
  if (fresh) placeMines(x, y);
  if (mines.has(k)) {
    S.over = true;
    setLost(true);
    S.verdict = 'You lost';
    return {};
  }
  const openedKeys = flood(x, y);
  if (opened.size === MS.w * MS.h - MS.mines) {
    S.over = true;
    S.verdict = 'You won';
    S.solo.msWins++;
    for (const m of mines) flags.add(m);
  }
  return { openedKeys };
}

export function soloFlag(x: number, y: number): void {
  if (S.over) return;
  const k = key(x, y);
  if (opened.has(k)) return;
  flags.has(k) ? flags.delete(k) : flags.add(k);
}
