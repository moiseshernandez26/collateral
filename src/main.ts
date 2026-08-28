import './style.css';
import { S, FORCE_DUO } from './state';
import { startGame } from './controller';
import { CORE } from './tools/core';
import { toolDef } from './tools/helpers';

function goSolo(msg: string): void {
  S.duel = false;
  S.mcp = false;
  const pill = document.getElementById('pill')!;
  pill.className = 'pill off';
  pill.textContent = msg;
  document.getElementById('logSec')!.style.display = 'none';
}

async function playVsAgent(mc: ModelContext): Promise<void> {
  try {
    for (const t of CORE) await mc.registerTool(toolDef(t));
    S.mcp = true;
    S.duel = true;
    document.getElementById('pill')!.className = 'pill on';
  } catch (err) {
    console.error(err);
    goSolo('tools not executable · single player');
  }
  startGame('ms', false);
}

function playSolo(): void {
  goSolo('single player');
  startGame('ms', false);
}

// document.modelContext existing only means this browser CAN register tools —
// it says nothing about whether an actual agent is attached to call them (no
// ChatGPT desktop app, no MCP inspector). Ask the human instead of assuming
// duel mode.
function askHowToPlay(mc: ModelContext): void {
  const picker = document.getElementById('picker')!;
  picker.style.display = 'flex';
  document.getElementById('pickAgent')!.addEventListener(
    'click',
    () => {
      picker.style.display = 'none';
      playVsAgent(mc);
    },
    { once: true },
  );
  document.getElementById('pickSolo')!.addEventListener(
    'click',
    () => {
      picker.style.display = 'none';
      playSolo();
    },
    { once: true },
  );
}

function boot(): void {
  const mc = document.modelContext;
  if (!mc || typeof mc.registerTool !== 'function') {
    if (FORCE_DUO) {
      S.duel = true;
      document.getElementById('pill')!.textContent = 'duel mode forced · no tools';
    } else {
      goSolo('no webmcp · single player');
    }
    startGame('ms', false);
    return;
  }
  askHowToPlay(mc);
}

boot();
