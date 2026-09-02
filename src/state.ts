import type { MatchState, Player } from './types';

// No WebMCP -> single player. With WebMCP -> turn-based duel against the agent.
// ?duo=1 forces duel mode to test the UI without an agent.
export const FORCE_DUO = new URLSearchParams(location.search).get('duo') === '1';

export const S: MatchState = {
  game: 'ms',
  duel: false,
  mcp: false,
  turn: 'human',
  over: false,
  verdict: '',
  round: { human: 0, agent: 0 }, // round points (duel)
  series: { human: 0, agent: 0 }, // rounds won (duel)
  solo: { msWins: 0, c4Solved: 0, pongBest: 0, hanoiBest: 0 }, // single-player scoreboard
};

export const other = (p: Player): Player => (p === 'human' ? 'agent' : 'human');

export const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const agentMayAct = (): boolean => S.duel && !S.over && S.turn === 'agent';
