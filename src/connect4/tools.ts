import { paint } from '../controller';
import { guard } from '../tools/helpers';
import { drop } from './actions';
import { analysis, boardText } from './query';
import type { ToolDef } from '../types';

export const C4_TOOLS: ToolDef[] = [
  {
    name: 'c4_board',
    description: "Board as text, top to bottom. H = human's piece, A = yours, . = empty. The last row is the column numbers.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText(),
  },
  {
    name: 'c4_analysis',
    description:
      "Analyzes the position: columns where you win immediately (winning_now), where you must block because the human wins on their next drop (must_block), and ones that hand them the win (gives_opponent_a_win).",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => analysis('agent'),
  },
  {
    name: 'c4_drop',
    description: 'Drops your piece in a column, 0 to 6. It falls to the lowest free slot and passes the turn unless you win.',
    inputSchema: { type: 'object', properties: { column: { type: 'integer' } }, required: ['column'] },
    run: guard((args) => {
      const { result, drop: at } = drop(args.column as number, 'agent');
      paint({ drop: at });
      return result;
    }),
  },
];
