import { S, agentMayAct } from '../state';
import { startGame } from '../controller';
import type { GameId, ToolDef } from '../types';

export const CORE: ToolDef[] = [
  {
    name: 'get_match',
    description:
      "Returns which minigame you're in, whose turn it is, the round points, and the rounds won. Call it first to check if it's your turn.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => ({
      game: S.game,
      your_turn: agentMayAct(),
      turn: S.turn,
      round_over: S.over,
      verdict: S.verdict || null,
      round_points: { you: S.round.agent, human: S.round.human },
      rounds_won: { you: S.series.agent, human: S.series.human },
    }),
  },
  {
    name: 'list_games',
    description: 'Lists the arcade minigames and which one is active.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => [
      { id: 'ms', name: 'Minesweeper duel', active: S.game === 'ms' },
      { id: 'c4', name: 'Connect 4', active: S.game === 'c4' },
      { id: 'pong', name: 'Pong (real-time)', active: S.game === 'pong' },
    ],
  },
  {
    name: 'switch_game',
    description:
      "Switches minigame and starts a new round. On switching, the previous game's tools are unregistered and the new game's tools appear.",
    inputSchema: {
      type: 'object',
      properties: {
        game_id: {
          type: 'string',
          enum: ['ms', 'c4', 'pong'],
          description: "'ms' for minesweeper duel, 'c4' for Connect 4, 'pong' for real-time Pong",
        },
      },
      required: ['game_id'],
    },
    run: async (args) => {
      const gameId = args.game_id as GameId;
      await startGame(gameId, true);
      return { ok: true, game: gameId };
    },
  },
  {
    name: 'new_round',
    description: 'Starts a new round of the active game without clearing the rounds won.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      await startGame(S.game, true);
      return { ok: true, game: S.game };
    },
  },
];
