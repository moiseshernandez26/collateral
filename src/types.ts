export type Player = 'human' | 'agent';
export type GameId = 'ms' | 'c4' | 'pong' | 'hanoi';

export interface MatchState {
  game: GameId;
  duel: boolean;
  mcp: boolean;
  turn: Player;
  over: boolean;
  verdict: string;
  round: { human: number; agent: number };
  series: { human: number; agent: number };
  solo: { msWins: number; c4Solved: number; pongBest: number; hanoiBest: number };
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
  // May return a promise: pong_read deliberately blocks until the ball comes
  // at the agent, and switch_game/new_round await their re-registration.
  run: (args: Record<string, unknown>) => unknown;
}
