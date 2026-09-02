import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../state';
import { PONG, ball, paddle, running, agentFace, blank, setPaddle, setAgentReady } from './state';
import { step, moveAgentPaddle, beginRally, startRound } from './actions';
import { awaitApproach } from './agent';
import type { Snapshot } from './query';

// ---------------------------------------------------------------------------
// The whole agent loop, driven the way a real agent drives it: park a read,
// wait out a model round-trip, play the y it was given, park the next read.
//
// The engine tests next door check one mechanism at a time. This one exists
// because the failure being chased — "sometimes the agent just doesn't get
// woken" — is a property of the *sequence*, not of any single call, and it only
// shows up over many shots at realistic latency.
// ---------------------------------------------------------------------------

beforeEach(() => {
  blank();
  S.game = 'pong';
  S.duel = true;
  S.over = false;
  S.verdict = '';
  S.round = { human: 0, agent: 0 };
  S.series = { human: 0, agent: 0 };
  S.solo = { msWins: 0, c4Solved: 0, pongBest: 0, hanoiBest: 0 };
});

const TICK = 16;

interface Result {
  shotsAtAgent: number; // times the ball turned toward the agent
  wakes: number; // times a read was answered with 'approaching'
  missedWakes: number; // shots that reached the paddle with no wake at all
  conceded: number; // points the human scored
}

/**
 * Runs the rally with a scripted agent: it answers every wake after
 * `latencyMs` of simulated time, and always plays the intercept it was handed.
 * A perfect agent, so anything it loses is the page's fault, not its own.
 */
async function playAsAgent(latencyMs: number, ticks: number): Promise<Result> {
  const r: Result = { shotsAtAgent: 0, wakes: 0, missedWakes: 0, conceded: 0 };

  let woke: Snapshot | null = null;
  let answerAt = -1;
  let pending: number | null = null; // intercept the agent is about to play
  let read = awaitApproach();
  void read.then((s) => (woke = s));

  // The human is a wall: it always returns. This isolates the agent's side.
  let sawApproach = false;
  let wokenForThisShot = false;

  for (let t = 0; t < ticks * TICK; t += TICK) {
    setPaddle('human', ball.y); // perfect human, so rallies actually last
    step(TICK);
    await null; // let a promise settled inside step() deliver its .then

    const approaching = ball.vx < 0;
    if (approaching && !sawApproach) {
      r.shotsAtAgent++;
      wokenForThisShot = false;
    }
    // The ball has arrived at the agent's end: did anyone tell the agent?
    if (sawApproach && !approaching && !wokenForThisShot) r.missedWakes++;
    sawApproach = approaching;

    if (woke) {
      const s = woke as Snapshot;
      woke = null;
      if (s.event === 'approaching') {
        r.wakes++;
        wokenForThisShot = true;
        pending = s.intercept_y;
        answerAt = t + latencyMs;
      } else {
        // timeout, superseded, whatever: a real agent just reads again
        read = awaitApproach();
        void read.then((x) => (woke = x));
      }
    }

    if (answerAt >= 0 && t >= answerAt) {
      answerAt = -1;
      if (pending !== null) moveAgentPaddle(pending);
      pending = null;
      read = awaitApproach();
      void read.then((x) => (woke = x));
    }

    if (S.over) break;
  }
  r.conceded = S.round.human;
  return r;
}

describe('the wake trigger, over a whole rally', () => {
  it('wakes the agent for every shot that comes at it', async () => {
    beginRallyFromStart();
    const r = await playAsAgent(1200, 4000);
    expect(r.shotsAtAgent).toBeGreaterThan(3); // the rally actually happened
    expect(r.missedWakes).toBe(0);
    expect(r.wakes).toBeGreaterThanOrEqual(r.shotsAtAgent);
  });

  it('never concedes a point while the agent plays every y it is handed', async () => {
    beginRallyFromStart();
    const r = await playAsAgent(1200, 4000);
    expect(r.conceded).toBe(0);
  });

  // The latency sweep is the point: a trigger that only works at one speed of
  // agent is a trigger that "sometimes doesn't work".
  for (const latency of [0, 300, 900, 2000, 4000, 7000]) {
    it(`holds up with a ${latency}ms agent`, async () => {
      beginRallyFromStart();
      const r = await playAsAgent(latency, 3000);
      expect(r.missedWakes).toBe(0);
      expect(r.conceded).toBe(0);
    });
  }

  it('keeps waking the agent after it misses and the ball is re-served', async () => {
    beginRallyFromStart();
    // A deliberately useless agent: it reads, but parks the paddle in a corner.
    let woke: Snapshot | null = null;
    let read = awaitApproach();
    void read.then((s) => (woke = s));
    let wakes = 0;
    for (let t = 0; t < 3000 * TICK && !S.over; t += TICK) {
      setPaddle('human', ball.y);
      step(TICK);
      await null;
      if (woke) {
        if ((woke as Snapshot).event === 'approaching') {
          wakes++;
          moveAgentPaddle(PONG.paddleH / 2); // top corner: always a miss
        }
        woke = null;
        read = awaitApproach();
        void read.then((s) => (woke = s));
      }
    }
    // It lost the round, but it was told about every single shot on the way.
    expect(S.round.human).toBe(PONG.target);
    expect(wakes).toBeGreaterThanOrEqual(PONG.target);
  });
});

// The version above models a tidy agent: the next read is parked the instant
// the move lands. A real one round-trips again first, so there is a window with
// no read parked at all — and a real human misses, which re-serves the ball.
// Both are exactly the conditions a "sometimes it doesn't fire" bug would hide
// in, so they get their own harness.
async function playRealistically(opts: {
  think: number; // ms between the wake and the move
  gap: number; // ms between the move and the next read being parked
  humanMissEvery: number; // human lets one through every N shots (0 = never)
  ticks: number;
}): Promise<Result> {
  const r: Result = { shotsAtAgent: 0, wakes: 0, missedWakes: 0, conceded: 0 };
  let woke: Snapshot | null = null;
  let parked = false;
  let answerAt = -1;
  let parkAt = -1;
  let pending: number | null = null;
  let sawApproach = false;
  let wokenForThisShot = false;
  let humanShots = 0;

  const park = (): void => {
    parked = true;
    void awaitApproach().then((s) => {
      parked = false;
      woke = s;
    });
  };
  park();

  for (let t = 0; t < opts.ticks * TICK && !S.over; t += TICK) {
    if (ball.vx > 0) {
      humanShots++;
      const miss = opts.humanMissEvery > 0 && humanShots % opts.humanMissEvery === 0;
      if (!miss) setPaddle('human', ball.y);
    }
    step(TICK);
    await null;

    const approaching = ball.vx < 0;
    if (approaching && !sawApproach) {
      r.shotsAtAgent++;
      wokenForThisShot = false;
    }
    if (sawApproach && !approaching && !wokenForThisShot) r.missedWakes++;
    sawApproach = approaching;

    if (woke) {
      const s = woke as Snapshot;
      woke = null;
      if (s.event === 'approaching') {
        r.wakes++;
        wokenForThisShot = true;
        pending = s.intercept_y;
        answerAt = t + opts.think;
      } else {
        parkAt = t + opts.gap; // timed out: a real client re-reads after a beat
      }
    }
    if (answerAt >= 0 && t >= answerAt) {
      answerAt = -1;
      if (pending !== null) moveAgentPaddle(pending);
      pending = null;
      parkAt = t + opts.gap; // the dead window: no read is parked during it
    }
    if (parkAt >= 0 && t >= parkAt && !parked) {
      parkAt = -1;
      park();
    }
  }
  r.conceded = S.round.human;
  return r;
}

describe('the wake trigger under realistic agent timing', () => {
  for (const [think, gap] of [
    [1200, 800],
    [2500, 1500],
    [400, 3000], // slow to come back for the next read
    [3000, 3000],
  ]) {
    it(`fires for every shot with a ${think}ms think and a ${gap}ms gap`, async () => {
      beginRallyFromStart();
      const r = await playRealistically({ think, gap, humanMissEvery: 0, ticks: 3000 });
      expect(r.shotsAtAgent).toBeGreaterThan(2);
      expect(r.missedWakes).toBe(0);
    });
  }

  it('fires for every shot when the human keeps missing and the ball is re-served', async () => {
    beginRallyFromStart();
    const r = await playRealistically({ think: 1200, gap: 900, humanMissEvery: 3, ticks: 4000 });
    expect(r.shotsAtAgent).toBeGreaterThan(3);
    expect(r.missedWakes).toBe(0);
  });

  it('fires for every shot when both sides are erratic', async () => {
    beginRallyFromStart();
    const r = await playRealistically({ think: 2500, gap: 2500, humanMissEvery: 2, ticks: 4000 });
    expect(r.missedWakes).toBe(0);
  });
});

function beginRallyFromStart(): void {
  setAgentReady(true); // pong_ready would have done this in the real flow
  startRound();
  beginRally();
  expect(running).toBe(true);
  setPaddle('agent', PONG.h / 2);
  expect(ball.x).toBeGreaterThan(agentFace);
  expect(paddle.agent).toBe(PONG.h / 2);
}
