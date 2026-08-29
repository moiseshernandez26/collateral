import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { PONG, ball, paddle, rallies, running, thinking, agentFace, humanFace, blank, serve, setPaddle } from './state';
import { step, moveAgentPaddle, moveHumanPaddle } from './actions';
import { awaitApproach, releaseWaiter } from './agent';

beforeEach(() => {
  blank();
  S.game = 'pong';
  S.duel = true;
  S.over = false;
  S.verdict = '';
  S.turn = 'human';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0 };
});

// Drives the simulation in small slices, the way the rAF loop does.
function run(ms: number, sliceMs = 16): void {
  for (let t = 0; t < ms; t += sliceMs) step(sliceMs);
}

describe('step', () => {
  it('bounces the ball off the top and bottom walls instead of losing it', () => {
    serve(1);
    ball.x = PONG.w / 2;
    ball.y = PONG.ballR + 1;
    ball.vx = 40;
    ball.vy = -300;
    step(50);
    expect(ball.y).toBeGreaterThanOrEqual(PONG.ballR);
    expect(ball.vy).toBeGreaterThan(0);
  });

  it('keeps the ball inside the court over a long rally', () => {
    serve(-1);
    for (let i = 0; i < 400; i++) {
      setPaddle('agent', ball.y);
      setPaddle('human', ball.y);
      step(16);
      if (S.over) break;
      expect(ball.y).toBeGreaterThanOrEqual(-1);
      expect(ball.y).toBeLessThanOrEqual(PONG.h + 1);
    }
  });

  it('returns the ball when a paddle is in the way', () => {
    serve(-1);
    ball.x = agentFace + 30;
    ball.y = 150;
    ball.vx = -300;
    ball.vy = 0;
    setPaddle('agent', 150);
    run(300);
    expect(ball.vx).toBeGreaterThan(0); // sent back toward the human
    expect(S.round.human).toBe(0);
  });

  it('awards the point to the human when the agent paddle misses', () => {
    serve(-1);
    ball.x = agentFace + 30;
    ball.y = 40;
    ball.vx = -320;
    ball.vy = 0;
    setPaddle('agent', 260); // nowhere near
    run(600);
    expect(S.round.human).toBe(1);
  });

  it('awards the point to the agent when the human paddle misses', () => {
    serve(1);
    ball.x = humanFace - 30;
    ball.y = 40;
    ball.vx = 320;
    ball.vy = 0;
    setPaddle('human', 260);
    run(600);
    expect(S.round.agent).toBe(1);
  });

  it('does not let a fast ball tunnel through a correctly placed paddle', () => {
    serve(-1);
    ball.x = agentFace + PONG.ballR + 40; // leading edge still short of the face
    ball.y = 150;
    ball.vx = -PONG.maxSpeed;
    ball.vy = 0;
    setPaddle('agent', 150);
    step(100); // one huge frame, the worst case for tunnelling
    expect(S.round.human).toBe(0);
    expect(ball.vx).toBeGreaterThan(0);
  });

  it('ends the round and the series point at the target score', () => {
    serve(1);
    S.round.agent = PONG.target - 1;
    ball.x = humanFace - 20;
    ball.y = 40;
    ball.vx = 320;
    ball.vy = 0;
    setPaddle('human', 260);
    run(600);
    expect(S.over).toBe(true);
    expect(S.series.agent).toBe(1);
    expect(S.verdict).toBe('Agent won');
  });

  it('does nothing once the round is over', () => {
    serve(1);
    S.over = true;
    const before = { ...ball };
    step(16);
    expect(ball.x).toBe(before.x);
    expect(ball.y).toBe(before.y);
  });
});

describe('single player', () => {
  beforeEach(() => {
    S.duel = false;
  });

  it('bounces off the left wall rather than conceding a point', () => {
    serve(-1);
    ball.x = 40;
    ball.y = 150;
    ball.vx = -300;
    ball.vy = 0;
    run(300);
    expect(ball.vx).toBeGreaterThan(0);
    expect(S.over).toBe(false);
  });

  it('ends the run and records the best score when the ball gets past you', () => {
    serve(1);
    ball.x = humanFace - 20;
    ball.y = 40;
    ball.vx = 320;
    ball.vy = 0;
    setPaddle('human', 260);
    run(600);
    expect(S.over).toBe(true);
    expect(S.verdict).toBe('Ball lost');
    expect(S.solo.pongBest).toBe(rallies);
  });
});

describe('moveAgentPaddle', () => {
  it('clamps the paddle inside the court and says so', () => {
    serve(-1);
    const r = moveAgentPaddle(-500) as { ok: boolean; paddle_y: number; clamped: boolean };
    expect(r.ok).toBe(true);
    expect(r.clamped).toBe(true);
    expect(r.paddle_y).toBe(PONG.paddleH / 2);
  });

  it('rejects a non-numeric y', () => {
    serve(-1);
    expect(moveAgentPaddle('middle')).toMatchObject({ ok: false, reason: 'y must be a finite number' });
  });

  it('rejects a move in single player, where the agent has no paddle', () => {
    S.duel = false;
    expect(moveAgentPaddle(100)).toMatchObject({ ok: false });
  });

  it('rejects a move once the round is over', () => {
    S.over = true;
    expect(moveAgentPaddle(100)).toMatchObject({ ok: false, reason: 'the round is already over' });
  });

  it('clears the slow-motion window so the ball resumes full speed', async () => {
    serve(-1);
    ball.x = PONG.w * 0.5;
    ball.vx = -300;
    await awaitApproach();
    expect(thinking).toBe(true);
    moveAgentPaddle(150);
    expect(thinking).toBe(false);
  });
});

describe('awaitApproach', () => {
  it('answers immediately when the ball is already coming at the agent', async () => {
    serve(-1);
    ball.x = PONG.w * 0.5;
    ball.vx = -300;
    const snap = await awaitApproach();
    expect(snap.event).toBe('approaching');
    expect(snap.intercept_y).not.toBeNull();
  });

  it('blocks until the ball turns around, then reports the approach', async () => {
    serve(1);
    ball.x = humanFace - 40;
    ball.y = 150;
    ball.vx = 300;
    ball.vy = 0;
    setPaddle('human', 150);
    const pending = awaitApproach();
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // still heading away, nothing to answer yet
    // The ball needs ~0.6s to reach the human paddle, come back, and cross the
    // wake-up line; simulate well past that so the test can't sit on the edge.
    run(1500);
    const snap = await pending;
    expect(snap.event).toBe('approaching');
    expect(snap.heading).toBe('toward_you');
  });

  it('resolves a parked read instead of leaving it hanging when the round ends', async () => {
    serve(1);
    ball.vx = 300;
    const pending = awaitApproach();
    releaseWaiter('round_over');
    expect((await pending).event).toBe('round_over');
  });

  it('replaces a previous read rather than stacking two waiters', async () => {
    serve(1);
    ball.vx = 300;
    const first = awaitApproach();
    const second = awaitApproach();
    expect((await first).event).toBe('superseded');
    releaseWaiter();
    expect((await second).event).toBe('round_over');
  });

  it('does not block in single player', async () => {
    S.duel = false;
    serve(1);
    expect((await awaitApproach()).event).toBe('not_a_duel');
  });

  // Without this the agent can spin read/move/read/move against a single shot,
  // burning round-trips while the ball has not moved at all.
  it('hands one shot over exactly once, then waits for the next', async () => {
    serve(-1);
    ball.x = PONG.w * 0.5;
    ball.y = 150;
    ball.vx = -300;
    ball.vy = 0;
    expect((await awaitApproach()).event).toBe('approaching');

    let settled = false;
    const second = awaitApproach();
    void second.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // same shot, so this one has to wait
    releaseWaiter('round_over');
    await second;
  });

  // The mirror image: if nothing was listening when the shot began, a read
  // arriving late must still catch it rather than skipping the whole rally.
  it('still answers a read that arrives after the shot already turned', async () => {
    serve(1);
    ball.x = humanFace - 40;
    ball.y = 150;
    ball.vx = 300;
    ball.vy = 0;
    setPaddle('human', 150);
    // Long enough for the human to return it and the ball to cross the
    // wake-up line, short enough that it has not reached the agent yet.
    run(700);
    expect(ball.vx).toBeLessThan(0);
    expect(ball.x).toBeLessThan(PONG.w * PONG.approachAt);
    expect((await awaitApproach()).event).toBe('approaching');
  });
});

describe('moveHumanPaddle', () => {
  it('clamps to the court like the agent tool does', () => {
    moveHumanPaddle(10_000);
    expect(paddle.human).toBe(PONG.h - PONG.paddleH / 2);
  });
});

describe('running flag', () => {
  it('is set by a serve and cleared when a point lands', () => {
    serve(1);
    expect(running).toBe(true);
    ball.x = humanFace - 20;
    ball.y = 40;
    ball.vx = 320;
    ball.vy = 0;
    setPaddle('human', 260);
    S.round.agent = PONG.target - 1;
    run(600);
    expect(running).toBe(false);
  });
});
