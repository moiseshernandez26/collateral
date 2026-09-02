import { paint } from '../controller';
import { guard } from '../tools/helpers';
import { fire } from './actions';
import { boardText, targets } from './query';
import { BS } from './state';
import type { ToolDef } from '../types';

export const BS_TOOLS: ToolDef[] = [
  {
    name: 'bs_board',
    description:
      "Enemy waters as text, as far as your own shots have revealed them: '.' never fired at, 'o' miss, 'X' hit, '#' part of a sunk ship. Also lists which enemy ships are still afloat and the damage to your own fleet. " +
      'There is no tool that shows you where their ships are, and there is no point looking at the page for it — the board on screen only draws what you have already earned. Fire, and use bs_targets to fire well.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText('agent'),
  },
  {
    name: 'bs_targets',
    description:
      'The deduction, already done. For every cell you have not fired at, it counts how many ways the enemy ships still afloat can be placed over it given everything your shots have shown — misses block a placement, and so does touching a sunk ship, since ships are never adjacent. ' +
      '`best` is the cell with the most ways, and is the shot to take. `mode` is "finish" when one of your hits belongs to a ship that has not sunk yet, in which case only placements covering that hit are counted and the top cell is the one that finishes it; otherwise "hunt". Call this before every shot.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => targets('agent'),
  },
  {
    name: 'bs_fire',
    description:
      `Fires one shot into enemy waters at (x, y), each from 0 to ${BS.n - 1}, x across and y down. Answers 'miss', 'hit', or 'sunk' with the length of the ship you sank. ` +
      'A HIT KEEPS YOUR TURN, so fire again immediately — check bs_targets first, it will now be in "finish" mode. A miss passes the turn to the human. Firing at a cell you have already fired at is rejected and costs you nothing.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'integer', description: `column, 0 to ${BS.n - 1}` },
        y: { type: 'integer', description: `row, 0 to ${BS.n - 1}` },
      },
      required: ['x', 'y'],
    },
    run: guard((args) => {
      const { result, cell } = fire(args.x, args.y, 'agent');
      paint(cell === null ? undefined : { shot: cell });
      return result;
    }),
  },
];
