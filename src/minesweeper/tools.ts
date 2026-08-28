import { paint } from '../controller';
import { guard } from '../tools/helpers';
import { reveal, claim } from './actions';
import { frontier, boardText } from './query';
import type { ToolDef } from '../types';

export const MS_TOOLS: ToolDef[] = [
  {
    name: 'ms_board',
    description:
      "Board as text. ? = closed, . = open with no mines nearby, 1-8 = neighboring mines, H = human's mine, A = your mine.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText(),
  },
  {
    name: 'ms_frontier',
    description:
      'Deducible constraints. For each open numbered cell: how many mines are still missing around it (remaining) and which closed cells surround it (unknown). If remaining equals the number of unknown cells, all of them are mines. If remaining is 0, all of them are safe.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => frontier(),
  },
  {
    name: 'ms_reveal',
    description:
      'Opens a closed cell and passes the turn. If it had a mine, the point goes to the human. x is the column, y is the row, both range 0 to 8.',
    inputSchema: {
      type: 'object',
      properties: { x: { type: 'integer' }, y: { type: 'integer' } },
      required: ['x', 'y'],
    },
    run: guard((args) => {
      const { result, openedKeys } = reveal(args.x as number, args.y as number, 'agent');
      paint(openedKeys);
      return result;
    }),
  },
  {
    name: 'ms_claim',
    description:
      'Claims a cell as a mine. Getting it right earns a point and keeps your turn, so it pays to chain every safe claim before opening anything. Getting it wrong only costs the turn.',
    inputSchema: {
      type: 'object',
      properties: { x: { type: 'integer' }, y: { type: 'integer' } },
      required: ['x', 'y'],
    },
    run: guard((args) => {
      const { result } = claim(args.x as number, args.y as number, 'agent');
      paint();
      return result;
    }),
  },
];
