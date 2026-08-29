import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { PONG, ball, blank, serve, setPaddle, agentFace, humanFace } from './state';
import { step } from './actions';
import { predict, snapshot, boardText } from './query';

beforeEach(() => {
  blank();
  S.game = 'pong';
  S.duel = true;
  S.over = false;
  S.round = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0 };
});

describe('predict', () => {
  it('returns null for the side the ball is moving away from', () => {
    serve(1);
    ball.vx = 300;
    expect(predict('agent')).toBeNull();
    expect(predict('human')).not.toBeNull();
  });

  it('projects a straight shot to the same height', () => {
    serve(-1);
    ball.x = 300;
    ball.y = 120;
    ball.vx = -300;
    ball.vy = 0;
    expect(predict('agent')).toBeCloseTo(120, 1);
  });

  it('accounts for a single wall bounce', () => {
    serve(-1);
    ball.x = 300;
    ball.y = 150;
    ball.vx = -200;
    ball.vy = -200; // heading up-left, must bounce off the top wall
    const p = predict('agent')!;
    expect(p).toBeGreaterThanOrEqual(PONG.ballR);
    expect(p).toBeLessThanOrEqual(PONG.h - PONG.ballR);
  });

  // The whole point of the aid: whatever it says, that is where the ball
  // actually shows up. Simulating it is the only honest way to check.
  it('matches where the ball really arrives, across many random shots', () => {
    for (let i = 0; i < 200; i++) {
      blank();
      serve(-1);
      ball.x = 200 + Math.random() * 200;
      ball.y = PONG.ballR + Math.random() * (PONG.h - 2 * PONG.ballR);
      const speed = 200 + Math.random() * 300;
      const angle = (Math.random() - 0.5) * 1.6;
      ball.vx = -speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);

      const predicted = predict('agent')!;
      setPaddle('agent', predicted);
      // Step until the ball reaches the agent's paddle plane.
      for (let n = 0; n < 400 && ball.vx < 0; n++) step(8);
      expect(S.round.human).toBe(0); // a paddle parked on the prediction never misses
    }
  });
});

describe('snapshot', () => {
  it('reports the court, the score, and whether the round is over', () => {
    serve(-1);
    const s = snapshot('approaching');
    expect(s.ok).toBe(true);
    expect(s.event).toBe('approaching');
    expect(s.court).toEqual({
      width: PONG.w,
      height: PONG.h,
      paddle_height: PONG.paddleH,
      y_range: [PONG.paddleH / 2, PONG.h - PONG.paddleH / 2],
    });
    expect(s.round_over).toBe(false);
    expect(s.target).toBe(PONG.target);
  });

  it('names the heading from the agent point of view', () => {
    serve(-1);
    ball.vx = -300;
    expect(snapshot('x').heading).toBe('toward_you');
    ball.vx = 300;
    expect(snapshot('x').heading).toBe('away_from_you');
  });

  it('keeps intercept_y inside the reachable court', () => {
    serve(-1);
    ball.x = 400;
    ball.y = 20;
    ball.vx = -260;
    ball.vy = 420;
    const y = snapshot('x').intercept_y!;
    expect(y).toBeGreaterThanOrEqual(PONG.ballR);
    expect(y).toBeLessThanOrEqual(PONG.h - PONG.ballR);
  });
});

describe('boardText', () => {
  it('describes both paddles and which way the ball is going', () => {
    serve(-1);
    ball.vx = -300;
    const text = boardText();
    expect(text).toContain('heading toward you');
    expect(text).toContain(`first to ${PONG.target}`);
    expect(text.split('\n').length).toBe(5);
  });
});

describe('court geometry', () => {
  it('puts the paddle faces inside the court with room to play', () => {
    expect(agentFace).toBeGreaterThan(0);
    expect(humanFace).toBeLessThan(PONG.w);
    expect(humanFace - agentFace).toBeGreaterThan(PONG.w / 2);
  });
});
