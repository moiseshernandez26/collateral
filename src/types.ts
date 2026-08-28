export type Player = 'human' | 'agent';
export type GameId = 'ms' | 'c4';

export interface MatchState {
  game: GameId;
  duel: boolean;
  mcp: boolean;
  turn: Player;
  over: boolean;
  verdict: string;
  round: { human: number; agent: number };
  series: { human: number; agent: number };
  solo: { msWins: number; c4Solved: number };
}

export interface ToolResult {
  ok?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  run: (args: Record<string, unknown>) => unknown;
}
