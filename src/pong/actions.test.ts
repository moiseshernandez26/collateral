import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../state';
import {
  PONG,
  ball,
  paddle,
  rallies,
  running,
  thinking,
  awaitingStart,
  agentFace,
  humanFace,
  blank,
  serve,
  setPaddle,
} from './state';
import { step, moveAgentPaddle, moveHumanPaddle, driveHumanPaddle, startRound, beginRally } from './actions';
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

describe('the ready gate', () => {
  it('does not serve a duel round on its own', () => {
    startRound();
    expect(awaitingStart).toBe(true);
    expect(running).toBe(false);
    run(1000);
    expect(ball.x).toBe(PONG.w / 2); // the ball has not moved at all
  });

  it('serves at the agent once the human starts the rally', () => {
    startRound();
    beginRally();
    expect(awaitingStart).toBe(false);
    expect(running).toBe(true);
    expect(ball.vx).toBeLessThan(0);
  });

  it('ignores a second start, so a double click cannot re-serve a live rally', () => {
    startRound();
    beginRally();
    run(200);
    const moved = { ...ball };
    beginRally();
    expect(ball.x).toBe(moved.x);
    expect(ball.y).toBe(moved.y);
  });

  it('serves single player straight away — there is no agent to wait for', () => {
    S.duel = false;
    startRound();
    expect(awaitingStart).toBe(false);
    expect(running).toBe(true);
  });

  // It waits the full read timeout rather than answering early: every early
  // answer is a chance for the agent to leave the loop and report back, and an
  // agent that has wandered off leaves its paddle standing still.
  it('parks a read through the wait, then names the reason it gave up', async () => {
    vi.useFakeTimers();
    try {
      startRound();
      const pending = awaitApproach();
      let settled = false;
      void pending.then(() => (settled = true));
      vi.advanceTimersByTime(PONG.readTimeoutMs - 100);
      await Promise.resolve();
      expect(settled).toBe(false);
      vi.advanceTimersByTime(200);
      const snap = await pending;
      expect(snap.event).toBe('waiting_for_start');
      expect(snap.waiting_for_start).toBe(true);
      expect(snap.next_action).toMatch(/pong_read again/);
    } finally {
      vi.useRealTimers();
    }
  });

  // The point of the gate: a read placed before the human starts still catches
  // the very first shot, rather than timing out and missing it.
  it('wakes a read that was already parked when the rally begins', async () => {
    startRound();
    const pending = awaitApproach();
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    beginRally();
    run(600);
    expect((await pending).event).toBe('approaching');
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
    expect(moveAgentPaddle('middle')).toMatchObject({ ok: false });
  });

  // Rejecting "106.8" would enforce a JSON typing rule, not a rule of the game,
  // and it would cost the agent the shot.
  it('accepts a number that arrived quoted', () => {
    serve(-1);
    expect(moveAgentPaddle('106.8')).toMatchObject({ ok: true, paddle_y: 106.8, clamped: false });
  });

  it('tells the agent to go straight back to reading', () => {
    serve(-1);
    const r = moveAgentPaddle(150) as { event: string; next_action: string };
    expect(r.event).toBe('moved');
    expect(r.next_action).toMatch(/pong_read/);
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

describe('driveHumanPaddle', () => {
  it('moves by the elapsed time, not by a fixed jump per key press', () => {
    const from = paddle.human;
    driveHumanPaddle(-1, 100);
    expect(paddle.human).toBeCloseTo(from - PONG.paddleSpeed * 0.1, 5);
    driveHumanPaddle(1, 50);
    expect(paddle.human).toBeCloseTo(from - PONG.paddleSpeed * 0.05, 5);
  });

  it('crawls when the fine-control modifier is held', () => {
    const from = paddle.human;
    driveHumanPaddle(1, 100, true);
    expect(paddle.human).toBeCloseTo(from + PONG.paddleFine * 0.1, 5);
  });

  it('stays inside the court however long the key is held', () => {
    for (let i = 0; i < 60; i++) driveHumanPaddle(-1, 16);
    expect(paddle.human).toBe(PONG.paddleH / 2);
    for (let i = 0; i < 60; i++) driveHumanPaddle(1, 16);
    expect(paddle.human).toBe(PONG.h - PONG.paddleH / 2);
  });

  // A tab that was hidden for a minute must not teleport the paddle when it
  // comes back; the same cap `step` uses applies here.
  it('caps a single huge tick instead of jumping the whole elapsed time', () => {
    const from = paddle.human;
    driveHumanPaddle(1, 60_000);
    expect(paddle.human).toBeCloseTo(from + (PONG.paddleSpeed * PONG.maxTickMs) / 1000, 5);
  });

  it('does nothing with no direction held, or once the round is over', () => {
    const from = paddle.human;
    driveHumanPaddle(0, 100);
    expect(paddle.human).toBe(from);
    S.over = true;
    driveHumanPaddle(1, 100);
    expect(paddle.human).toBe(from);
  });

  // The paddle has to be able to chase the ball, or a shot aimed at a corner
  // would be unreturnable no matter how well the human plays.
  it('outruns the ball vertically', () => {
    expect(PONG.paddleSpeed).toBeGreaterThan(PONG.baseSpeed);
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
