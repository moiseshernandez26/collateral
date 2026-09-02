import './style.css';
import { S, FORCE_DUO } from './state';
import { startGame } from './controller';
import { setToolCount } from './log';
import { registerCoreTools, unregisterAllTools, watchToolChanges } from './tools/registry';

const el = (id: string): HTMLElement => document.getElementById(id)!;

/** Everything that differs between the two modes: the pill, the call rail, and
 *  where the dropdown is pointing. Called on boot and on every mode change. */
function paintMode(pillText?: string): void {
  const pill = el('pill');
  pill.className = S.duel ? 'pill on' : 'pill off';
  if (pillText) pill.textContent = pillText;
  el('logSec').style.display = S.duel ? '' : 'none';
  (el('mode') as HTMLSelectElement).value = S.duel ? 'duel' : 'solo';
}

async function goDuel(): Promise<void> {
  try {
    watchToolChanges();
    await registerCoreTools();
    S.mcp = true;
    S.duel = true;
    paintMode();
  } catch (err) {
    console.error(err);
    goSolo('tools not executable · single player');
  }
}

function goSolo(msg: string): void {
  unregisterAllTools();
  S.mcp = false;
  S.duel = false;
  // Hand the count back too, or paintPill() keeps writing the old "N tools"
  // line over the solo text the next time anything repaints.
  setToolCount(0);
  paintMode(msg);
}

async function onModeChange(): Promise<void> {
  const duel = (el('mode') as HTMLSelectElement).value === 'duel';
  if (duel === S.duel) return;
  if (!duel) goSolo('solo · tools unregistered');
  else if (document.modelContext) await goDuel();
  else {
    S.duel = true;
    paintMode('duel mode forced · no tools');
  }
  // A full reset, not `keep`: the scoreboard counts rounds won in a duel and a
  // single number in solo, so carrying one over into the other is nonsense.
  await startGame(S.game, false);
}

async function boot(): Promise<void> {
  const mc = document.modelContext;
  const capable = !!mc && typeof mc.registerTool === 'function';

  // The dropdown is only offered where there is a second mode to switch to.
  if (capable || FORCE_DUO) {
    el('modeWrap').hidden = false;
    el('mode').addEventListener('change', onModeChange);
  }

  if (capable) {
    // Duel on detection, and the tools go up before anything else. This used
    // to be a modal asking "vs agent or solo?", which was honest about the API
    // having no "a consumer is attached" signal — but it registered nothing
    // until a human clicked, so an agent that listed the page's tools on
    // attach saw an empty list and fell back to screenshots. The dropdown in
    // the bar answers the same question without gating registration on it.
    await goDuel();
  } else if (FORCE_DUO) {
    S.duel = true;
    paintMode('duel mode forced · no tools');
  } else {
    goSolo('no webmcp · single player');
  }
  await startGame('ms', false);
}

boot();
