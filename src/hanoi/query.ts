import { S, other } from '../state';
import type { Player } from '../types';
import { HANOI, OPTIMAL, peg, moves, legalMoves, elapsedFor, solved, startedAt, fmt, plural } from './state';

export interface Snapshot {
  your_pegs: number[][];
  moves_made: number;
  optimal_total: number;
  legal_moves: { from: number; to: number }[];
  elapsed: string;
  race_started: boolean;
  opponent_moves?: number;
  opponent_finished?: boolean;
}

export function snapshot(who: Player): Snapshot {
  const s: Snapshot = {
    your_pegs: peg[who].map((p) => [...p]),
    moves_made: moves[who],
    optimal_total: OPTIMAL,
    legal_moves: legalMoves(who),
    elapsed: fmt(elapsedFor(who)),
    race_started: startedAt !== null,
  };
  // How far the other side has got is public — both towers are on screen, and
  // knowing you are behind is part of a race. Only the move count, though: the
  // arrangement is theirs to work out, the same as it is for the human.
  if (S.duel) {
    s.opponent_moves = moves[other(who)];
    s.opponent_finished = solved(other(who));
  }
  return s;
}

/**
 * The legal moves, and nothing more. Deliberately *not* the optimal one.
 *
 * The house rule is to hand the agent the constraints rather than the drawing —
 * ms_frontier and c4_analysis both do exactly that. Hanoi is the case where the
 * line matters most: the optimal move is a four-line recursion, so a tool that
 * returned it would leave the agent nothing to do but transcribe, and the race
 * would demonstrate nothing. Legal moves keep it from wasting calls on invalid
 * ones without solving the puzzle for it.
 */
export function movesText(who: Player): string {
  const legal = legalMoves(who);
  return [
    `pegs (bottom to top), you are solving your own tower: ${peg[who].map((p, i) => `${i}:[${p.join(' ')}]`).join('  ')}`,
    `legal moves right now: ${legal.map((m) => `${m.from}->${m.to}`).join(', ')}`,
    `you have made ${plural(moves[who])}; ${OPTIMAL} is optimal for ${HANOI.discs} discs`,
    'these are the legal moves, not the good ones — which one to play is yours to work out',
  ].join('\n');
}

export function boardText(who: Player): string {
  const rows: string[] = [];
  for (let level = HANOI.discs - 1; level >= 0; level--) {
    const row = peg[who].map((p) => {
      const disc = p[level];
      return disc === undefined ? '  .  ' : `[${String(disc).repeat(1).padStart(2, ' ')} ]`;
    });
    rows.push('  ' + row.join(' '));
  }
  return [
    `your tower — move all ${HANOI.discs} discs onto peg ${HANOI.pegs - 1}. 1 is the smallest disc.`,
    ...rows,
    '   peg 0 peg 1 peg 2',
    `moves ${moves[who]} · optimal ${OPTIMAL} · clock ${fmt(elapsedFor(who))}${startedAt === null ? ' (not started)' : ''}`,
    S.duel ? `the human has made ${plural(moves[other(who)])}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
