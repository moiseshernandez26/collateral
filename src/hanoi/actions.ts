import { S } from '../state';
import type { Player, ToolResult } from '../types';
import {
  HANOI,
  OPTIMAL,
  peg,
  moves,
  canMove,
  solved,
  startClock,
  bumpMoves,
  markFinished,
  elapsedFor,
  fmt,
  startedAt,
} from './state';
import { snapshot } from './query';

/**
 * Moves one disc for `who`.
 *
 * There is no turn guard anywhere in this game, and that is the point of it:
 * both sides are solving their own tower at the same time, against one clock.
 * The rules it *can* break — an empty peg, a bigger disc onto a smaller one, a
 * move after it has already finished — are checked here.
 */
export function move(from: unknown, to: unknown, who: Player): ToolResult {
  if (S.game !== 'hanoi') return { ok: false, reason: 'hanoi is not the active game, call switch_game first' };
  if (S.over) return { ok: false, reason: 'the race is already over' };
  if (S.duel && startedAt === null)
    return { ok: false, reason: 'the race has not started — call hanoi_ready first, that is what starts the clock' };

  const f = Number(from);
  const t = Number(to);
  if (!Number.isInteger(f) || !Number.isInteger(t))
    return { ok: false, reason: `from and to must be whole peg numbers, 0 to ${HANOI.pegs - 1}` };
  if (f < 0 || t < 0 || f >= HANOI.pegs || t >= HANOI.pegs)
    return { ok: false, reason: `pegs are numbered 0 to ${HANOI.pegs - 1}` };
  if (f === t) return { ok: false, reason: 'that is the same peg — a move has to go somewhere else' };

  const disc = peg[who][f][peg[who][f].length - 1];
  if (disc === undefined) return { ok: false, reason: `peg ${f} is empty, there is nothing to pick up` };
  if (!canMove(who, f, t))
    return {
      ok: false,
      reason: `disc ${disc} cannot go on peg ${t}: a disc may only rest on a bigger one, and peg ${t} has ${peg[who][t][peg[who][t].length - 1]} on top`,
    };

  startClock();
  peg[who][f].pop();
  peg[who][t].push(disc);
  bumpMoves(who);

  if (solved(who)) {
    markFinished(who);
    S.over = true;
    if (S.duel) {
      S.series[who]++;
      S.verdict = who === 'human' ? 'You won the race' : 'Agent won the race';
    } else {
      // Kept in milliseconds, not seconds: rounded to one decimal a fast solve
      // lands on 0, and 0 is indistinguishable from "no time yet" in every
      // check that follows. A test caught exactly that.
      const ms = Math.max(1, Math.round(elapsedFor('human')));
      S.verdict = `Solved in ${fmt(elapsedFor('human'))}`;
      if (!S.solo.hanoiBest || ms < S.solo.hanoiBest) S.solo.hanoiBest = ms;
    }
  }

  return {
    ...snapshot(who),
    ok: true,
    moved: { disc, from: f, to: t },
    ...(solved(who) ? { solved: true, your_time: fmt(elapsedFor(who)), moves_taken: moves[who], optimal: OPTIMAL } : {}),
  };
}

/** Starts the race for both sides at the same instant. Called by hanoi_ready,
 *  and by the Space key when there is no agent attached to call it. */
export function beginRace(): void {
  if (S.game !== 'hanoi' || S.over) return;
  startClock();
}
