import { S } from '../state';
import { paint } from '../controller';
import { awaitingStart, agentReady } from './state';
import { beginRally } from './actions';

// The gate in front of a duel round. It exists because opening Pong used to
// serve the ball on the spot: the first points went by while the agent still
// had no idea which paddle was its own.
//
// The agent itself is now the start signal — `pong_ready` briefs it and starts
// the rally in the same call, so there is nothing for anyone to press. The
// modal is a waiting screen: it says what the two sides are, shows whether the
// agent has checked in, and gets out of the way the moment it does.

const modal = document.getElementById('pongReady')!;
const status = document.getElementById('pongReadyStatus')!;
let wired = false;

function wire(): void {
  if (wired) return;
  wired = true;
  // Escape dismisses without starting, so the modal can never trap someone who
  // just wanted to read the rules or switch games; the round stays parked.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') hideReady();
    // The escape hatch for a demo with no agent attached — and for ?duo=1,
    // where there is no agent by definition. Not a button: the ball is the
    // agent's to start, and a button is the thing that gets pressed by reflex
    // before the agent has checked in.
    else if ((e.key === ' ' || e.key === 'Enter') && S.game === 'pong' && awaitingStart && !S.over) {
      e.preventDefault();
      start();
    }
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
}

export function hideReady(): void {
  modal.style.display = 'none';
}

/** Repaints the agent's check-in line. */
export function paintReady(): void {
  status.textContent = agentReady
    ? 'agent checked in · it knows it plays the blue paddle'
    : 'waiting for the agent to call pong_ready…';
  status.classList.toggle('on', agentReady);
}

/** Serves the first ball and closes the waiting screen. Called by pong_ready. */
export function start(): void {
  hideReady();
  beginRally();
  paint();
}
