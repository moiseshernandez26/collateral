import { S } from '../state';
import { toolDef } from './helpers';
import { MS_TOOLS } from '../minesweeper/tools';
import { C4_TOOLS } from '../connect4/tools';
import { PONG_TOOLS } from '../pong/tools';
import type { GameId, ToolDef } from '../types';

const GAME_TOOLS: Record<GameId, ToolDef[]> = { ms: MS_TOOLS, c4: C4_TOOLS, pong: PONG_TOOLS };

let gameCtrl: AbortController | null = null;

export function getToolCount(id: GameId): number {
  return GAME_TOOLS[id].length;
}

export async function registerGameTools(id: GameId): Promise<void> {
  if (!S.mcp || !document.modelContext) return;
  if (gameCtrl) gameCtrl.abort();
  gameCtrl = new AbortController();
  for (const t of GAME_TOOLS[id]) {
    await document.modelContext.registerTool(toolDef(t), { signal: gameCtrl.signal });
  }
}
