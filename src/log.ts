import { esc } from './state';
import { metrics, recordCall } from './metrics';

// The header count reads straight off `metrics.calls` rather than a counter of
// its own — they used to be two separate numbers and drifted apart, since only
// the metrics one was reset on a new match.
export function paintMetrics(): void {
  document.getElementById('evCount')!.textContent = String(metrics.calls);
  document.getElementById('metricsLine')!.textContent =
    `${metrics.callsThisRound} this round · ${metrics.rejections} rejected · ${metrics.badMoves} bad`;
}

export function clearLog(): void {
  const box = document.getElementById('log')!;
  box.innerHTML = '<p class="blank">No calls yet.</p>';
  paintMetrics();
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
  // Pong's loop is chatty; without a cap the rail grows without bound over a
  // long rally and the oldest entries are never read anyway.
  while (box.children.length > 120) box.removeChild(box.lastChild!);
}
