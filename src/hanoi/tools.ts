import { paint } from '../controller';
import { move, beginRace } from './actions';
import { boardText, movesText, snapshot } from './query';
import { HANOI, OPTIMAL } from './state';
import type { ToolDef } from '../types';

// No guard() here, like Pong and for the same reason: there are no turns. Both
// sides work their own tower at the same time against one clock. What a move
// *can* get wrong — an empty peg, a big disc onto a small one, moving before
// the race starts — is checked inside move().
export const HANOI_TOOLS: ToolDef[] = [
  {
    name: 'hanoi_ready',
    description:
      `CALL THIS FIRST. It starts the clock — for both of you at the same instant — and hands you your starting position. Nothing moves until you do, so the human cannot get a head start while you are still reading. ` +
      `You each have your own tower of ${HANOI.discs} discs on peg 0 and have to get it onto peg ${HANOI.pegs - 1}; whoever finishes first wins the race. ${OPTIMAL} moves is optimal. ` +
      'Then go straight into moving: call hanoi_move over and over without stopping to report between moves. Every call costs you time on the clock, so plan the sequence once and play it out.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      beginRace();
      paint();
      return { ok: true, ...snapshot('agent'), note: 'clock running for both of you — start moving' };
    },
  },
  {
    name: 'hanoi_board',
    description:
      'Your own tower as text, bottom disc first, plus your move count and the clock. The human is solving an identical tower of their own beside yours; you cannot touch it and they cannot touch yours.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText('agent'),
  },
  {
    name: 'hanoi_moves',
    description:
      'The moves that are legal right now, so you never waste a call on an illegal one. It lists what you MAY do, not what you SHOULD — the good move is yours to work out, and working it out is the whole race. ' +
      'You do not need to call this between every move if you are following a plan; each hanoi_move answer already carries the new legal moves.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => movesText('agent'),
  },
  {
    name: 'hanoi_move',
    description:
      `Moves the top disc of peg \`from\` onto peg \`to\`, on YOUR tower. Pegs are numbered 0 to ${HANOI.pegs - 1}. A disc may only rest on a bigger one. ` +
      'Illegal moves are rejected with the reason and cost you nothing but the round-trip. The answer carries your new position and the legal moves from it, so call this again immediately — the clock is running.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'integer', description: `peg to take the top disc from, 0 to ${HANOI.pegs - 1}` },
        to: { type: 'integer', description: `peg to put it on, 0 to ${HANOI.pegs - 1}` },
      },
      required: ['from', 'to'],
    },
    run: (args) => {
      const result = move(args.from, args.to, 'agent');
      paint();
      return result;
    },
  },
];
