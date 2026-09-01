import { esc } from './state';
import { metrics, recordCall } from './metrics';

// How many tools are registered right now. The pill reports it together with
// whether anything has actually called one, so `controller` hands the number
// down rather than the log having to know about games.
let toolCount = 0;

export function setToolCount(n: number): void {
  toolCount = n;
  paintPill();
}

// "Tools registered" and "an agent is playing" are two different facts and the
// pill used to show only the first, which is the more flattering one. There is
// no way to detect a connected consumer — the API has no such signal — so the
// honest proxy is whether a call has ever arrived.
function paintPill(): void {
  const pill = document.getElementById('pill')!;
  if (!toolCount) return; // solo mode: main.ts owns the text
  pill.textContent = metrics.calls ? `${toolCount} tools active` : `${toolCount} tools · waiting for agent`;
  pill.classList.toggle('idle', metrics.calls === 0);
}

// The header count reads straight off `metrics.calls` rather than a counter of
// its own — they used to be two separate numbers and drifted apart, since only
// the metrics one was reset on a new match.
export function paintMetrics(): void {
  document.getElementById('evCount')!.textContent = String(metrics.calls);
  document.getElementById('metricsLine')!.textContent =
    `${metrics.callsThisRound} this round · ${metrics.rejections} rejected · ${metrics.badMoves} bad`;
  paintPill();
}

// Registering tools proves the browser can host them. It does NOT prove anything
// is listening: the API has no "a consumer is attached" signal at all (its whole
// surface is registerTool / getTools / executeTool / ontoolchange). So when the
// rail is empty the page says which half is which, because "nothing is
// happening" otherwise looks identical to "the page is broken".
const EMPTY_RAIL =
  '<p class="blank"><b>No calls yet.</b> The tools are registered and waiting. ' +
  'If nothing shows up here, the agent is not calling them — check that your agent ' +
  'is attached to <b>this tab</b>, and that it picked up the tool list after the ' +
  'page loaded.</p>';

export function clearLog(): void {
  const box = document.getElementById('log')!;
  box.innerHTML = EMPTY_RAIL;
  paintMetrics();
}

/**
 * A registration line, not a call. Deliberately styled apart from the agent's
 * calls: it says the browser is holding these tools right now, which is the
 * half of the story an empty rail otherwise leaves ambiguous.
 */
export function logTools(names: string[]): void {
  const box = document.getElementById('log')!;
  const el = document.createElement('div');
  el.className = 'ev sys';
  el.innerHTML =
    `<span class="t">${new Date().toLocaleTimeString('en-US', { hour12: false })}</span>` +
    `<span class="n">${names.length} tools registered</span>` +
    `<span class="r">${esc(names.join(' · '))}</span>`;
  box.prepend(el);
  trim(box);
}

export function logCall(name: string, args: Record<string, unknown>, res: unknown): void {
  recordCall(res);
  paintMetrics();
  const box = document.getElementById('log')!;
  const blank = box.querySelector('.blank');
  if (blank) blank.remove();

  const el = document.createElement('div');
  const failed = typeof res === 'object' && res !== null && (res as { ok?: boolean }).ok === false;
  el.className = 'ev' + (failed ? ' rej' : '');

  const a = args && Object.keys(args).length ? JSON.stringify(args) : '()';
  let r = typeof res === 'string' ? res.split('\n')[0] + ' …' : JSON.stringify(res);
  if (r && r.length > 170) r = r.slice(0, 170) + '…';

  el.innerHTML =
    `<span class="t">${new Date().toLocaleTimeString('en-US', { hour12: false })}</span>` +
    `<span class="n">${name}</span> <span>${esc(a)}</span><span class="r">${esc(r || '')}</span>`;
  box.prepend(el);
  trim(box);
}

// Pong's loop is chatty; without a cap the rail grows without bound over a
// long rally and the oldest entries are never read anyway.
function trim(box: HTMLElement): void {
  while (box.children.length > 120) box.removeChild(box.lastChild!);
}
