import { S } from '../state';
import type { Player } from '../types';
import { PONG, ball, paddle, rallies, agentFace, humanFace } from './state';

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

export interface Snapshot {
  ok: true;
  event: string;
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
  return {
    ok: true,
    event,
    ball: { x: r1(ball.x), y: r1(ball.y), vx: r1(ball.vx), vy: r1(ball.vy) },
    heading: ball.vx < 0 ? 'toward_you' : 'away_from_you',
    intercept_y: predict('agent'),
    your_paddle_y: r1(paddle.agent),
    court: { width: PONG.w, height: PONG.h, paddle_height: PONG.paddleH, y_range: [half, PONG.h - half] },
    score: { you: S.round.agent, human: S.round.human },
    target: PONG.target,
    round_over: S.over,
  };
}

export function boardText(): string {
  const pct = (v: number, max: number): number => Math.round((v / max) * 100);
  return [
    `court ${PONG.w}x${PONG.h}, you defend the left edge, the human defends the right`,
    `ball  x=${r1(ball.x)} y=${r1(ball.y)} vx=${r1(ball.vx)} vy=${r1(ball.vy)} (${pct(ball.x, PONG.w)}% across)`,
    `you   paddle centre y=${r1(paddle.agent)}   human paddle centre y=${r1(paddle.human)}`,
    `ball is heading ${ball.vx < 0 ? 'toward you' : 'away from you'}, rallies so far ${rallies}`,
    `score you ${S.round.agent} - human ${S.round.human}, first to ${PONG.target}`,
  ].join('\n');
}
