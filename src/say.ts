import { S } from './state';
import type { GameId } from './types';

/**
 * What to type at your agent.
 *
 * The page can register tools all day; if the human doesn't know what to ask
 * for, nothing happens — and "nothing happens" looks exactly like the page
 * being broken, which is the failure this whole rail exists to rule out. These
 * are the words that get a first tool call out of an agent that has just
 * attached.
 *
 * Each phrase carries the lesson that game learned the hard way: stay in the
 * loop for Pong, don't stop to report for Hanoi, don't click for the turn-based
 * two. They are the same instructions the tool descriptions give, said in the
 * human's direction instead of the agent's.
 */
export const SAY: Record<GameId, string> = {
  ms: "Play the minesweeper duel against me using this page's tools. Call ms_frontier before each move, then ms_reveal or ms_claim. Don't click the page — the board ignores it.",
  c4: "Play Connect 4 against me with this page's tools: c4_analysis to see the position, then c4_drop. Don't click the page — the board ignores it.",
  pong: "Play Pong with me. Call pong_ready first — it briefs you and serves. Then loop pong_read → pong_move and don't write anything back to me until a result says round_over.",
  hanoi: "Race me at Towers of Hanoi. Call hanoi_ready to start the clock, then move your tower onto peg 2 with hanoi_move. 31 moves is optimal. Don't stop to report between moves.",
};

/** Shorter, for the tab tooltips. */
const TIP: Record<GameId, string> = {
  ms: 'Ask your agent to play the minesweeper duel through the tools',
  c4: 'Ask your agent to play Connect 4 through the tools',
  pong: 'Ask your agent to call pong_ready, then stay in the read/move loop',
  hanoi: 'Ask your agent to call hanoi_ready and race you',
};

const TABS: Record<GameId, string> = { ms: 'tabMs', c4: 'tabC4', pong: 'tabPong', hanoi: 'tabHanoi' };

let shown = ''; // game+mode last painted, so a repaint mid-copy doesn't reset the button

export function paintSay(): void {
  const key = S.game + (S.duel ? '+duel' : '+solo');
  if (key === shown) return;
  shown = key;

  // Solo mode must not mention an opponent anywhere (requirements R3.4), so the
  // tooltips come off entirely rather than being reworded.
  for (const id of Object.keys(TABS) as GameId[]) {
    const tab = document.getElementById(TABS[id])!;
    if (S.duel) tab.dataset.tip = TIP[id];
    else delete tab.dataset.tip;
  }

  const text = document.getElementById('sayText');
  if (text) text.textContent = SAY[S.game];
  resetCopy();
}

function resetCopy(): void {
  const b = document.getElementById('sayCopy');
  if (b) {
    b.textContent = 'copy';
    b.classList.remove('done');
  }
}

const HOTKEY = /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent) ? '⌘C' : 'Ctrl+C';

/** Wired once at load. Both handlers are idempotent and touch nothing outside
 *  this block, so nothing here can get between an agent and the tools. */
export function wireSay(): void {
  const btn = document.getElementById('sayCopy');
  const text = document.getElementById('sayText');
  // Clicking the phrase selects it. Costs nothing, and it is the escape hatch
  // when the clipboard is unavailable.
  text?.addEventListener('click', selectSay);

  btn?.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(SAY[S.game]);
      ok = true;
    } catch {
      // The Clipboard API wants a secure context, permission *and* a genuine
      // user gesture. A demo opened over plain HTTP on a LAN IP has none of
      // them. Fall back rather than fail silently — the phrase is the point.
      ok = legacyCopy(SAY[S.game]);
    }
    if (!ok) selectSay();
    // Not "failed": say what to do next. The text is selected either way, so
    // the hotkey always finishes the job.
    btn.textContent = ok ? 'copied' : `press ${HOTKEY}`;
    btn.classList.toggle('done', ok);
    setTimeout(resetCopy, ok ? 1600 : 3200);
  });
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function selectSay(): void {
  const el = document.getElementById('sayText');
  if (!el) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}
