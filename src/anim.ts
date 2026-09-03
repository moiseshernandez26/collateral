/**
 * The safety net under every anime.js call on this page.
 *
 * anime.js writes a tween's *start* value synchronously and then advances on
 * `requestAnimationFrame` — and rAF does not run in a hidden tab, which here is
 * a demo case rather than an edge case: the agent often drives from another
 * window, so the board is in the background exactly when it is being played. An
 * animation started there never advances and the element keeps its start value
 * — a Connect 4 piece parked above the board, a minesweeper cell frozen at 60%
 * — and it survives every later repaint, because a repaint only rewrites
 * `className`.
 *
 * So the landing is on a timer rather than on anime's `complete`, which rides
 * on rAF too and therefore never fires in the case that needs it. Same lesson
 * as Pong's worker heartbeat: anything that must happen has to be driven by
 * something a background tab still runs.
 */
export function land(el: HTMLElement, ms: number): void {
  setTimeout(() => (el.style.transform = ''), ms + 80);
}
