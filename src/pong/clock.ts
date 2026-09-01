// Pong's heartbeat for when the tab is hidden.
//
// `requestAnimationFrame` does not run in a hidden tab, and a hidden tab is the
// normal case here, not an edge one: the agent driving the game usually lives in
// another window, which is exactly when Pong has to keep running. The first
// version of this fell back to `setInterval` on the main thread, and that turns
// out to be almost useless — measured in Chrome on a hidden tab:
//
//     setInterval(50ms) on the main thread ...... 6 ticks in 5 s
//     setInterval(50ms) inside a Worker ........ 103 ticks in 5 s
//
// Background pages have their timers clamped to roughly one per second, and
// after a few minutes hidden it gets far worse than that. The symptom was the
// whole game freezing while the agent waited for a ball that never arrived, so
// its paddle never moved — which reads as "the agent isn't playing".
//
// Timers inside a dedicated worker are not clamped, and the `message` event it
// posts is not a timer, so the main thread runs the tick at full rate. The
// worker is built from a blob: no build-config entry, nothing extra to ship,
// still a purely static page.

const SRC = 'setInterval(() => postMessage(0), 50);';

let worker: Worker | null = null;
let fallback = 0;

export function startHeartbeat(tick: () => void): void {
  if (worker || fallback) return;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' })));
    worker.onmessage = tick;
  } catch {
    // No Worker or no blob URLs (a locked-down browser, a test environment).
    // A throttled clock beats a stopped one.
    worker = null;
    fallback = self.setInterval(tick, 50);
  }
}

export function stopHeartbeat(): void {
  worker?.terminate();
  worker = null;
  if (fallback) clearInterval(fallback);
  fallback = 0;
}
