// Backlog: "Session metrics: calls per round, rejections, bad moves." Pure
// counters — no DOM here, so this stays unit-tested like the engine layers,
// unlike log.ts which paints it.

export interface Metrics {
  calls: number;
  callsThisRound: number;
  rejections: number;
  badMoves: number;
}

export let metrics: Metrics = { calls: 0, callsThisRound: 0, rejections: 0, badMoves: 0 };

function isRejection(res: unknown): boolean {
  return typeof res === 'object' && res !== null && (res as { ok?: unknown }).ok === false;
}

// A "bad move" is one the agent's own tool result says cost it: a wrong mine
// claim or opening an actual mine. There's no equivalent signal on c4_drop's
// own response (knowing a drop was bad needs the analysis from the turn
// before it, which this log doesn't keep), so Connect 4 only gets calls and
// rejections.
function isBadMove(res: unknown): boolean {
  if (typeof res !== 'object' || res === null) return false;
  const r = res as Record<string, unknown>;
  return r.ok === true && (r.result === 'wrong' || r.result === 'mine');
}

export function recordCall(result: unknown): void {
  metrics.calls++;
  metrics.callsThisRound++;
  if (isRejection(result)) metrics.rejections++;
  else if (isBadMove(result)) metrics.badMoves++;
}

export function resetRoundMetrics(): void {
  metrics.callsThisRound = 0;
}

export function resetMatchMetrics(): void {
  metrics = { calls: 0, callsThisRound: 0, rejections: 0, badMoves: 0 };
}
