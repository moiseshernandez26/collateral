// The per-game action buttons. Split out of controller.ts to keep both under
// the ~200-line module guideline (CLAUDE.md) once Pong made it a third game.
import { S } from './state';
import { paint, startGame } from './controller';
import { claimMode, flagMode, fresh, toggleClaimMode, toggleFlagMode } from './minesweeper/state';
import { awaitingStart } from './pong/state';
import { start as startRally } from './pong/ready';

const actsEl = document.getElementById('acts')!;

function btn(label: string, fn: () => void, opts?: { on?: boolean; disabled?: boolean }): void {
  const b = document.createElement('button');
  b.textContent = label;
  if (opts?.on) b.className = 'on';
  if (opts?.disabled) b.disabled = true;
  b.addEventListener('click', fn);
  actsEl.appendChild(b);
}

function resetScore(): void {
  S.series = { human: 0, agent: 0 };
  startGame(S.game, false);
}

export function paintActs(): void {
  actsEl.innerHTML = '';
  if (S.game === 'ms') {
    if (S.duel) {
      btn(
        claimMode ? 'Claiming mine' : 'Claim mine',
        () => {
          toggleClaimMode();
          paint();
        },
        { on: claimMode, disabled: S.over || S.turn !== 'human' || fresh },
      );
      btn('New round', () => startGame('ms', true));
      btn('Reset score', resetScore);
    } else {
      btn(
        flagMode ? 'Flag active' : 'Place flags',
        () => {
          toggleFlagMode();
          paint();
        },
        { on: flagMode, disabled: S.over },
      );
      btn('New game', () => startGame('ms', true));
    }
  } else if (S.duel) {
    // The way back in if the ready modal was dismissed to read the rules first.
    if (S.game === 'pong' && awaitingStart && !S.over) btn('Start rally', startRally, { on: true });
    btn('New round', () => startGame(S.game, true));
    btn('Reset score', resetScore);
  } else if (S.game === 'c4') {
    btn(S.over ? 'Next puzzle' : 'Skip puzzle', () => startGame('c4', true));
  } else {
    btn(S.over ? 'New run' : 'Restart', () => startGame('pong', true));
  }
}
