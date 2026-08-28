import { esc } from './state';

let evs = 0;

export function logCall(name: string, args: Record<string, unknown>, res: unknown): void {
  evs++;
  document.getElementById('evCount')!.textContent = String(evs);
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
}
