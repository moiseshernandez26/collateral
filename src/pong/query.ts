import { S } from '../state';
import type { Player } from '../types';
import { PONG, ball, paddle, rallies, awaitingStart, agentFace, humanFace } from './state';

const r1 = (n: number): number => Math.round(n * 10) / 10;

// The deduction aid, same idea as ms_frontier and c4_analysis: hand the agent
// the answer it would otherwise have to derive. Reflecting the ball off the
// top and bottom walls analytically is the whole trick — an agent reasoning
// about it from raw vx/vy gets it wrong often enough to lose every rally.
export function predict(who: Player): number | null {
  const towardAgent = ball.vx < 0;
  if (ball.vx === 0) return null;
  if (who === 'agent' ? !towardAgent : towardAgent) return null;

  const dx = who === 'agent' ? ball.x - PONG.ballR - agentFace : humanFace - (ball.x + PONG.ballR);
  if (dx <= 0) return r1(ball.y);

  const y = ball.y + ball.vy * (dx / Math.abs(ball.vx));
  // Fold the free-flight y back into the court by unrolling the wall bounces.
  const lo = PONG.ballR;
  const span = PONG.h - 2 * PONG.ballR;
  if (span <= 0) return r1(ball.y);
  let k = (y - lo) % (2 * span);
  if (k < 0) k += 2 * span;
  if (k > span) k = 2 * span - k;
  return r1(lo + k);
}

// Repeated on every single response, deliberately. An agent that skims the
// tool list and starts playing has to be told which paddle is its own
// *somewhere it cannot miss it* — the one time this was only in the
// descriptions, the agent went for the mouse and played the human's paddle.
export const YOU_ARE =
  'the BLUE paddle on the LEFT — it moves only via pong_move; the mouse and the arrow keys are the human\'s';

// The single most load-bearing field in the whole game. An agent that reads one
// result and stops to tell the user what happened has left the rally, and the
// paddle then sits still for the rest of the round — which is exactly what went
// wrong live. So every result ends by naming the next call, in the imperative.
export function nextAction(event: string, interceptY: number | null): string {
  switch (event) {
    case 'approaching':
      return `call pong_move with y=${interceptY} RIGHT NOW, then call pong_read again. Do not write anything to the user in between.`;
    case 'moved':
      return 'call pong_read again RIGHT NOW to wait for the next shot. The rally is still running.';
    case 'waiting_for_start':
      return 'the round has not started: call pong_ready to serve the first ball, then call pong_read again. Do not answer the user, stay in the loop.';
    case 'timeout':
      return 'nothing came at you yet. Call pong_read again immediately — do not answer the user, stay in the loop.';
    case 'superseded':
      return 'ignore this result: a newer pong_read is already waiting for the ball.';
    case 'round_over':
    case 'not_a_duel':
    case 'not_active':
      return 'stop looping. Now you can tell the user how it went.';
    default:
      return 'call pong_read.';
  }
}

export interface Snapshot {
  ok: true;
  event: string;
  next_action: string;
  you_are: string;
  waiting_for_start: boolean;
  ball: { x: number; y: number; vx: number; vy: number };
  heading: 'toward_you' | 'away_from_you';
  intercept_y: number | null;
  your_paddle_y: number;
  court: { width: number; height: number; paddle_height: number; y_range: [number, number] };
  score: { you: number; human: number };
  target: number;
  round_over: boolean;
}

export function snapshot(event: string): Snapshot {
  const half = PONG.paddleH / 2;
  const intercept = predict('agent');
  return {
    ok: true,
    event,
    next_action: nextAction(event, intercept),
    you_are: YOU_ARE,
    waiting_for_start: awaitingStart,
    ball: { x: r1(ball.x), y: r1(ball.y), vx: r1(ball.vx), vy: r1(ball.vy) },
    heading: ball.vx < 0 ? 'toward_you' : 'away_from_you',
    intercept_y: intercept,
    your_paddle_y: r1(paddle.agent),
    court: { width: PONG.w, height: PONG.h, paddle_height: PONG.paddleH, y_range: [half, PONG.h - half] },
    score: { you: S.round.agent, human: S.round.human },
    target: PONG.target,
    round_over: S.over,
  };
}

/**
 * What pong_ready hands back. This is the one place the whole game is
 * explained to the agent in one piece, before a ball is in play — the
 * descriptions alone were not enough to stop an agent from reaching for the
 * mouse and playing the human's paddle.
 */
export function briefing(): string {
  const half = PONG.paddleH / 2;
  return [
    'CHECKED IN. The page is now showing the human that you have been briefed.',
    '',
    `WHICH PADDLE IS YOURS: you are ${YOU_ARE}.`,
    `It sits at x=${agentFace} and right now its centre is at y=${r1(paddle.agent)}.`,
    `The human is the RED paddle on the right, at x=${humanFace}. It is not yours and you cannot move it.`,
    '',
    'HOW YOU MOVE: only by calling pong_move with a y. Nothing else moves your paddle.',
    'Do NOT click, drag, type, move the mouse, or take a screenshot of this page:',
    "that is the human's keyboard and mouse, and using it plays THEIR paddle, not yours.",
    '',
    `THE COURT: ${PONG.w} wide, ${PONG.h} tall. y=0 is the top, y=${PONG.h} the bottom.`,
    `Your paddle centre can go from y=${half} to y=${PONG.h - half}; anything outside is clamped, not rejected.`,
    '',
    'THE LOOP, ALL IN ONE TURN, WITHOUT REPORTING BACK BETWEEN SHOTS:',
    '  1. pong_read  — blocks until the ball is coming at you, then gives you intercept_y',
    '  2. pong_move  — pass that exact intercept_y',
    '  3. go back to 1, until a result comes back with round_over: true',
    'While you are deciding, the page slows the ball to 12% speed, so one round-trip',
    'to you fits inside a rally. Answer promptly and it stays a fair game.',
    '',
    'STAYING IN THE LOOP IS THE WHOLE GAME. Every result ends with a next_action',
    'field naming the call to make; make it immediately. If you stop to write the',
    'user a progress report between shots, your paddle stands still and you lose',
    'the round. Say nothing until a result comes back with round_over: true.',
    '',
    awaitingStart
      ? 'THE ROUND HAS NOT STARTED YET — calling this tool is what serves the first ball, so it is starting now. Go straight into the loop: call pong_read.'
      : 'THE ROUND IS LIVE. Call pong_read now.',
  ].join('\n');
}

export function boardText(): string {
  const pct = (v: number, max: number): number => Math.round((v / max) * 100);
  return [
    `you are ${YOU_ARE}`,
    awaitingStart
      ? 'the round has NOT started: call pong_ready, which serves the first ball, then go into the pong_read / pong_move loop.'
      : 'the round is live',
    `court ${PONG.w}x${PONG.h}, you defend the left edge, the human defends the right`,
    `ball  x=${r1(ball.x)} y=${r1(ball.y)} vx=${r1(ball.vx)} vy=${r1(ball.vy)} (${pct(ball.x, PONG.w)}% across)`,
    `you   paddle centre y=${r1(paddle.agent)}   human paddle centre y=${r1(paddle.human)}`,
    `ball is heading ${ball.vx < 0 ? 'toward you' : 'away from you'}, rallies so far ${rallies}`,
    `score you ${S.round.agent} - human ${S.round.human}, first to ${PONG.target}`,
  ].join('\n');
}
