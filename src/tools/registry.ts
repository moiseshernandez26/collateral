import { S } from '../state';
import { toolDef } from './helpers';
import { MS_TOOLS } from '../minesweeper/tools';
import { C4_TOOLS } from '../connect4/tools';
import { PONG_TOOLS } from '../pong/tools';
import { HANOI_TOOLS } from '../hanoi/tools';
import { logTools } from '../log';
import type { GameId, ToolDef } from '../types';

const GAME_TOOLS: Record<GameId, ToolDef[]> = { ms: MS_TOOLS, c4: C4_TOOLS, pong: PONG_TOOLS, hanoi: HANOI_TOOLS };

let gameCtrl: AbortController | null = null;

export async function registerGameTools(id: GameId): Promise<number> {
  if (!S.mcp || !document.modelContext) return 0;
  if (gameCtrl) gameCtrl.abort();
  gameCtrl = new AbortController();
  for (const t of GAME_TOOLS[id]) {
    await document.modelContext.registerTool(toolDef(t), { signal: gameCtrl.signal });
  }
  // Read the count back off the browser instead of returning what we asked for.
  // "The tools didn't register" and "nothing is calling them" are the two ways
  // an empty rail happens, and a count we computed ourselves can't tell them
  // apart — it would say 8 either way.
  const live = await liveTools();
  return live.length || CORE_PLUS(id);
}

const CORE_PLUS = (id: GameId): number => GAME_TOOLS[id].length + 4;

async function liveTools(): Promise<string[]> {
  try {
    const tools = await document.modelContext?.getTools?.();
    return (tools ?? []).map((t) => t.name);
  } catch {
    return [];
  }
}

// Every tool added or removed fires this, so a game switch fires it a dozen
// times; collapse them and report the list once it settles. This is the third
// demo moment made visible on the page itself rather than only in the
// inspector — and, when the rail is otherwise empty, it is the proof that the
// registering half worked and the calling half is what's missing.
export function watchToolChanges(): void {
  const mc = document.modelContext;
  if (!mc || !('ontoolchange' in mc)) return;
  let pending = 0;
  mc.ontoolchange = () => {
    clearTimeout(pending);
    pending = window.setTimeout(async () => {
      const names = await liveTools();
      if (names.length) logTools(names);
    }, 80);
  };
}
