import { S } from '../state';
import { paint } from '../controller';
import { awaitingStart, agentReady } from './state';
import { beginRally } from './actions';

// The "ready?" gate in front of a duel round. Opening Pong used to serve the
// ball on the spot: the first points went by while the human was still reading
// the rules and the agent still had no idea which paddle was its own. Nothing
// moves now until someone presses Start.
//
// It is also where the agent checking in becomes visible — pong_ready flips the
// status line, so the room can see the agent has been briefed before the ball
// is live, and see it *hasn't* if it went off clicking things instead.

const modal = document.getElementById('pongReady')!;
const status = document.getElementById('pongReadyStatus')!;
const startBtn = document.getElementById('pongStart')!;
let wired = false;

function wire(): void {
  if (wired) return;
  wired = true;
  startBtn.addEventListener('click', start);
  // Escape dismisses without starting, so the modal can never trap someone who
  // just wanted to look at the rules or switch games — the round stays parked
  // and the "Start rally" button in the acts row brings it back.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') hideReady();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideReady();
  });
}

export function showReady(): void {
  wire();
  if (!S.duel || !awaitingStart || S.over) return;
  modal.style.display = 'flex';
  paintReady();
  startBtn.focus();
}

export function hideReady(): void {
  modal.style.display = 'none';
}

/** Repaints the agent's check-in line. Called by pong_ready, which can land
 *  while the modal is already open. */
export function paintReady(): void {
  status.textContent = agentReady
    ? 'agent checked in · it knows it plays the blue paddle'
    : 'waiting for the agent to check in… (it should call pong_ready)';
  status.classList.toggle('on', agentReady);
}

export function start(): void {
  hideReady();
  beginRally();
  paint();
}
