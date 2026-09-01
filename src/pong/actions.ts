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
  setHoldSpent,
  setAwaitingStart,
  awaitingStart,
  addRally,
  serve,
} from './state';
import { snapshot } from './query';
import { tryDeliver, releaseWaiter, holdForAgent } from './agent';

export function moveAgentPaddle(y: unknown): ToolResult {
  if (S.game !== 'pong') return { ok: false, reason: 'pong is not the active game, call switch_game first' };
  if (!S.duel) return { ok: false, reason: 'pong is in single-player mode, there is no agent paddle' };
  if (S.over) return { ok: false, reason: 'the round is already over' };
  // A quoted number is taken as a number. Rejecting "106.8" would be enforcing
  // a JSON typing rule, not a rule of the game, and it costs the agent a shot.
  const n = typeof y === 'string' && y.trim() !== '' ? Number(y) : y;
  if (typeof n !== 'number' || !Number.isFinite(n))
    return { ok: false, reason: 'y must be a finite number, the intercept_y that pong_read gave you' };

  const at = setPaddle('agent', n);
  setThinking(false); // full speed resumes the moment the agent commits
  return { ...snapshot('moved'), paddle_y: at, clamped: at !== n };
}

export function moveHumanPaddle(y: number): void {
  setPaddle('human', y);
}

/**
 * Moves the human paddle by however far it travels in `dtMs` at `dir`
 * (-1 up, 1 down, 0 idle). Time-based rather than a fixed jump per keydown, so
 * holding the key glides at the same speed no matter the frame rate or the key
 * repeat delay — the render loop calls this once per frame with the elapsed ms.
 */
export function driveHumanPaddle(dir: -1 | 0 | 1, dtMs: number, fine = false): void {
  if (!dir || S.game !== 'pong' || S.over) return;
  const speed = fine ? PONG.paddleFine : PONG.paddleSpeed;
  setPaddle('human', paddle.human + dir * speed * (Math.min(dtMs, PONG.maxTickMs) / 1000));
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
  if (thinking && now() - thinkingSince > PONG.thinkTimeoutMs) {
    setThinking(false);
    // Whichever kind of wait just ran out, this shot doesn't get another one:
    // otherwise `holdForAgent` re-arms on the next tick and the ball crawls
    // forever waiting for an agent that isn't coming back.
    setHoldSpent(true);
  }

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

    if (ball.vx > 0) {
      setApproachFired(false);
      setHoldSpent(false);
    } else if (tryDeliver()) {
      // Stop here rather than burning the rest of this tick at full speed: on
      // a coarse tick (a hidden tab falls back to ~1s timers) the ball could
      // otherwise fly past the paddle in the very tick that woke the agent.
      break;
    } else {
      // Nothing was listening when this shot turned. Slow the ball anyway and
      // let it wait for the agent to come back and ask — see holdForAgent().
      holdForAgent();
    }
  }
  return false;
}

export function startRound(): void {
  // A duel doesn't serve on its own. Opening Pong used to drop straight into a
  // live rally — points went by before the human had their hands on the keys or
  // the agent knew which paddle was its own — so the round now waits behind the
  // ready modal until beginRally() is called.
  if (S.duel) {
    setAwaitingStart(true);
    return;
  }
  // Solo: serve at the left wall, which gives the player a beat to settle in.
  serve(-1);
}

/** Serves the first ball of the round, at the agent, so its first pong_read
 *  has something to catch straight away. Triggered by the agent's own
 *  pong_ready — checking in is what starts the match. */
export function beginRally(): void {
  if (!awaitingStart || S.over) return;
  serve(-1);
}
