import { S } from '../state';
import type { Player, ToolResult } from '../types';
import {
  PONG,
  ball,
  paddle,
  rallies,
  running,
  thinking,
  thinkingSince,
  agentFace,
  humanFace,
  now,
  setPaddle,
  setRunning,
  setThinking,
  setApproachFired,
  addRally,
  serve,
} from './state';
import { snapshot } from './query';
import { tryDeliver, releaseWaiter } from './agent';

export function moveAgentPaddle(y: unknown): ToolResult {
  if (S.game !== 'pong') return { ok: false, reason: 'pong is not the active game, call switch_game first' };
  if (!S.duel) return { ok: false, reason: 'pong is in single-player mode, there is no agent paddle' };
  if (S.over) return { ok: false, reason: 'the round is already over' };
  if (typeof y !== 'number' || !Number.isFinite(y)) return { ok: false, reason: 'y must be a finite number' };

  const at = setPaddle('agent', y);
  setThinking(false); // full speed resumes the moment the agent commits
  return { ...snapshot('moved'), paddle_y: at, clamped: at !== y };
}

export function moveHumanPaddle(y: number): void {
  setPaddle('human', y);
}

function bounce(who: Player): void {
  const face = who === 'human' ? humanFace : agentFace;
  ball.x = who === 'human' ? face - PONG.ballR : face + PONG.ballR;
  // Where the ball struck the paddle sets the outgoing angle, so a rally can
  // be steered rather than just mirrored back.
  const off = Math.max(-1, Math.min(1, (ball.y - paddle[who]) / (PONG.paddleH / 2)));
  const speed = Math.min(PONG.maxSpeed, Math.hypot(ball.vx, ball.vy) + PONG.speedStep);
  const angle = off * 0.9;
  ball.vx = (who === 'human' ? -1 : 1) * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
  addRally();
  if (who === 'agent') setThinking(false);
}

function point(who: Player): void {
  setRunning(false);
  if (!S.duel) {
    S.over = true;
    S.verdict = 'Ball lost';
    if (rallies > S.solo.pongBest) S.solo.pongBest = rallies;
    return;
  }
  S.round[who]++;
  if (S.round[who] >= PONG.target) {
    S.over = true;
    S.series[who]++;
    S.verdict = who === 'human' ? 'You won the round' : 'Agent won';
    releaseWaiter();
    return;
  }
  serve(who === 'human' ? -1 : 1); // serve at whoever just conceded
}

/**
 * Advances the simulation. Returns true when something the scoreboard cares
 * about happened (a point, or the round ending), so the caller repaints.
 */
export function step(dtMs: number): boolean {
  if (!running || S.over) return false;
  if (thinking && now() - thinkingSince > PONG.thinkTimeoutMs) setThinking(false);

  // Substepping below makes any dt safe from tunnelling, so this cap is only
  // about not simulating minutes of catch-up after a long hidden stretch.
  let remaining = (Math.min(dtMs, PONG.maxTickMs) / 1000) * (thinking ? PONG.slowScale : 1);

  while (remaining > 0) {
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    // Never travel more than a ball radius per substep: this is what keeps a
    // fast ball from tunnelling straight through a paddle.
    const dt = Math.min(remaining, PONG.ballR / speed);
    remaining -= dt;

    const px = ball.x;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y < PONG.ballR) {
      ball.y = PONG.ballR;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y > PONG.h - PONG.ballR) {
      ball.y = PONG.h - PONG.ballR;
      ball.vy = -Math.abs(ball.vy);
    }

    // Right edge: always the human's paddle. Only the substep that actually
    // crosses the paddle face counts as a hit, so a paddle slid into place
    // after the ball went by can't catch it retroactively.
    if (ball.vx > 0 && px + PONG.ballR <= humanFace && ball.x + PONG.ballR > humanFace) {
      if (Math.abs(ball.y - paddle.human) <= PONG.paddleH / 2 + PONG.ballR) bounce('human');
    }
    if (ball.x - PONG.ballR > PONG.w) {
      point('agent');
      return true;
    }

    // Left edge: the agent's paddle in a duel, a plain wall in single player.
    if (S.duel) {
      if (ball.vx < 0 && px - PONG.ballR >= agentFace && ball.x - PONG.ballR < agentFace) {
        if (Math.abs(ball.y - paddle.agent) <= PONG.paddleH / 2 + PONG.ballR) bounce('agent');
      }
      if (ball.x + PONG.ballR < 0) {
        point('human');
        return true;
      }
    } else if (ball.x < PONG.ballR) {
      ball.x = PONG.ballR;
      ball.vx = Math.abs(ball.vx);
    }

    if (ball.vx > 0) setApproachFired(false);
    else if (tryDeliver()) {
      // Stop here rather than burning the rest of this tick at full speed: on
      // a coarse tick (a hidden tab falls back to ~1s timers) the ball could
      // otherwise fly past the paddle in the very tick that woke the agent.
      break;
    }
  }
  return false;
}

export function startRound(): void {
  // Duel: serve at the agent so its first pong_read has something to catch.
  // Solo: serve at the left wall, which gives the player a beat to settle in.
  serve(-1);
}
