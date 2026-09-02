import { S } from '../state';
import {
  PONG,
  ball,
  running,
  awaitingStart,
  agentReady,
  thinking,
  holdSpent,
  approachFired,
  setApproachFired,
  setThinking,
} from './state';
import { snapshot, type Snapshot } from './query';

// ---------------------------------------------------------------------------
// The agent loop.
//
// A tool call is request/response, but Pong is continuous — so pong_read is
// deliberately a *blocking* read: it hands back a promise that only settles
// once the ball is actually coming at the agent. That turns the agent's
// natural "call a tool, read the answer, call the next tool" rhythm into the
// rally itself, all inside one message turn. See design.md's "Pong and the
// agent loop" before changing any of this.
// ---------------------------------------------------------------------------

let waiter: { resolve: (v: Snapshot) => void; timer: ReturnType<typeof setTimeout> } | null = null;

function isApproaching(): boolean {
  return running && !S.over && ball.vx < 0 && ball.x <= PONG.w * PONG.approachAt;
}

/**
 * The ball has turned on the agent and nothing is listening yet, so slow it
 * down anyway and let it wait for the agent to *ask*.
 *
 * This closes the hole that made the trigger look unreliable. Slow motion used
 * to cover only half of the agent's cycle — from the wake to `pong_move` — while
 * the other half, the client round-tripping back into `pong_read`, ran at full
 * speed. An agent with a slow enough gap between its move and its next read
 * would have a whole shot arrive and bounce inside that gap: no read was parked
 * when the ball crossed the wake line, so nothing was announced, and from the
 * outside the trigger simply "didn't fire". Reproduced in loop.test.ts at a
 * 3s think and a 3s gap.
 *
 * The premise of this game is that the ball waits for the agent. It should
 * therefore wait for the whole round-trip, not for the convenient half.
 */
export function holdForAgent(): void {
  if (!S.duel || !agentReady || thinking || holdSpent) return;
  if (approachFired || waiter) return; // already handed over, or about to be
  if (!isApproaching()) return;
  setThinking(true);
}

function settle(event: string): void {
  if (!waiter) return;
  clearTimeout(waiter.timer);
  const { resolve } = waiter;
  waiter = null;
  resolve(snapshot(event));
}

export function awaitApproach(): Promise<Snapshot> {
  if (S.game !== 'pong') return Promise.resolve(snapshot('not_active'));
  if (!S.duel) return Promise.resolve(snapshot('not_a_duel'));
  if (S.over) return Promise.resolve(snapshot('round_over'));
  // Already coming at us and not yet handed over: answer straight away rather
  // than waiting for the *next* approach, which would skip this shot entirely.
  // Once it HAS been handed over, park instead — otherwise the agent can spin
  // read/move/read/move against a single shot, with no backpressure at all.
  if (isApproaching() && !approachFired) {
    setApproachFired(true);
    setThinking(true);
    return Promise.resolve(snapshot('approaching'));
  }
  settle('superseded'); // a second read replaces the first, never stacks
  return new Promise<Snapshot>((resolve) => {
    // One wait, whatever it is waiting for. A read placed before the human
    // calls pong_ready parks right through it and is woken by the serve,
    // so the agent crosses the start of the round inside a single call — every
    // early answer is another chance for it to leave the loop and report back
    // to its user, and a paddle whose agent has wandered off stands still.
    // `event` still says which kind of wait ran out.
    const timer = setTimeout(() => {
      waiter = null;
      resolve(snapshot(awaitingStart ? 'waiting_for_start' : 'timeout'));
    }, PONG.readTimeoutMs);
    waiter = { resolve, timer };
  });
}

/**
 * Hands the current approach to a parked read, if there is one to hand it to.
 * Returns true when it did, so the simulation can stop and give the agent its
 * moment. `approachFired` means "this shot has been handed to the agent", not
 * "this shot started" — so a read arriving slightly late still catches the
 * shot instead of parking until the next one and missing the whole rally.
 */
export function tryDeliver(): boolean {
  if (approachFired || !waiter || !isApproaching()) return false;
  setApproachFired(true);
  setThinking(true);
  settle('approaching');
  return true;
}

// Called when the round ends or the game is switched away, so a pending read
// resolves instead of hanging until its timeout.
export function releaseWaiter(reason = 'round_over'): void {
  settle(reason);
}
