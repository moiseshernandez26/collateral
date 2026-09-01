import type { Player } from '../types';

// Pong is real-time, unlike the other two games. Everything here is in one
// fixed logical coordinate space (480x300); render.ts scales it to whatever
// the canvas is actually sized at, so the physics never depend on layout.
export const PONG = {
  w: 480,
  h: 300,
  paddleW: 10,
  paddleH: 62,
  ballR: 6,
  inset: 14, // gap between the paddle and its wall
  baseSpeed: 235,
  maxSpeed: 520,
  speedStep: 15, // added to the ball's speed on every paddle hit
  // The human paddle is driven only by the arrow keys — there is no pointer
  // control, on purpose (see render.ts). It has to outrun the ball's vertical
  // component or the court would be indefensible, hence a speed above
  // baseSpeed; Shift drops it to `paddleFine` for placing the last few pixels.
  paddleSpeed: 420,
  paddleFine: 150,
  target: 5, // points that win a duel round
  // The ball crawls at this fraction of full speed while the agent is deciding.
  // Without it a round-trip to the agent (~1-3s) is longer than the ball takes
  // to cross the court, and the agent could never return a single shot.
  slowScale: 0.12,
  // Give up on an agent that asked for the ball and never moved, so a stalled
  // agent leaves the game slow-but-playable instead of frozen forever.
  thinkTimeoutMs: 9000,
  // pong_read answers with event:'timeout' rather than hanging on the agent's
  // side if nothing comes at it in this long.
  readTimeoutMs: 8000,
  // Fraction of the court the ball must cross before the agent is woken.
  approachAt: 0.62,
  // Longest slice of real time one tick may simulate. Substepping makes any
  // value safe from tunnelling; this only stops a tab that was hidden for
  // minutes from replaying all of it at once when it comes back.
  maxTickMs: 250,
};

// The x planes the ball actually collides with: the inner face of each paddle.
export const agentFace = PONG.inset + PONG.paddleW;
export const humanFace = PONG.w - PONG.inset - PONG.paddleW;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export let ball: Ball = { x: PONG.w / 2, y: PONG.h / 2, vx: 0, vy: 0 };
export let paddle: Record<Player, number> = { human: PONG.h / 2, agent: PONG.h / 2 };
export let rallies = 0;
export let running = false;
// A duel round doesn't serve the moment Pong opens: the ball waits behind a
// "ready?" modal, because starting a live match under the agent's feet is how
// the first point gets conceded before anyone has read the rules.
export let awaitingStart = false;
export let agentReady = false; // the agent has called pong_ready and checked in
export let thinking = false; // a pong_read resolved and no pong_move has landed yet
export let thinkingSince = 0;
export let approachFired = false; // the agent has already been woken for this approach

export const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function setPaddle(who: Player, y: number): number {
  const half = PONG.paddleH / 2;
  paddle[who] = Math.max(half, Math.min(PONG.h - half, y));
  return paddle[who];
}

export function setRunning(v: boolean): void {
  running = v;
}

export function setThinking(v: boolean): void {
  thinking = v;
  thinkingSince = v ? now() : 0;
}

export function setApproachFired(v: boolean): void {
  approachFired = v;
}

export function setAwaitingStart(v: boolean): void {
  awaitingStart = v;
}

export function setAgentReady(v: boolean): void {
  agentReady = v;
}

export function addRally(): void {
  rallies++;
}

export function blank(): void {
  ball = { x: PONG.w / 2, y: PONG.h / 2, vx: 0, vy: 0 };
  paddle = { human: PONG.h / 2, agent: PONG.h / 2 };
  rallies = 0;
  running = false;
  thinking = false;
  thinkingSince = 0;
  approachFired = false;
  awaitingStart = false;
  agentReady = false;
}

// `toward` is -1 to serve at the agent (left) or 1 to serve at the human.
export function serve(toward: -1 | 1): void {
  ball.x = PONG.w / 2;
  ball.y = PONG.h / 2;
  const angle = Math.random() * 0.6 - 0.3; // shallow, so the first shot is returnable
  ball.vx = toward * PONG.baseSpeed * Math.cos(angle);
  ball.vy = PONG.baseSpeed * Math.sin(angle);
  approachFired = false;
  thinking = false;
  thinkingSince = 0;
  running = true;
  awaitingStart = false;
}
