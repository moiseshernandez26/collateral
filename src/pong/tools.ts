import { paint } from '../controller';
import { moveAgentPaddle } from './actions';
import { awaitApproach } from './agent';
import { boardText } from './query';
import type { ToolDef } from '../types';

// Note there is no guard() here, unlike the other two games. Pong is real-time:
// there are no turns to be out of, and the agent's paddle is its own at all
// times. The rules it *can* break — moving in single player, moving after the
// round is over, sending a non-number — are enforced inside moveAgentPaddle.
export const PONG_TOOLS: ToolDef[] = [
  {
    name: 'pong_state',
    description:
      "The court right now, as text, without waiting for anything. Use it to get your bearings; use pong_read to actually play.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText(),
  },
  {
    name: 'pong_read',
    description:
      "Waits for the ball, then tells you exactly where to be. THIS CALL DOES NOT ANSWER IMMEDIATELY: it blocks until the ball is heading at your side of the court, then returns `intercept_y` — the y where the ball will actually reach your paddle, with the wall bounces already worked out. While you decide, the page slows the ball to a crawl so a round-trip to you fits inside the rally. " +
      "PLAY IT AS A LOOP, ALL IN ONE TURN, WITHOUT STOPPING TO REPORT BETWEEN SHOTS: call pong_read, then immediately call pong_move with the `intercept_y` it gave you, then call pong_read again, and keep going until a result comes back with `round_over: true`. " +
      "`event` says what woke you: 'approaching' means play the shot now; 'timeout' means nothing came at you in time, just call pong_read again; 'round_over' or 'not_a_duel' means stop looping. " +
      'If this call fails outright instead of answering, the game was switched out from under it and these tools no longer exist — call get_match rather than retrying.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => awaitApproach(),
  },
  {
    name: 'pong_move',
    description:
      'Puts the centre of your paddle at y and lets the ball go back to full speed. Pass the `intercept_y` you just got from pong_read to return the shot. y is clamped to the court, so an out-of-range value is pinned rather than rejected. Call pong_read again straight after this — the rally is still running.',
    inputSchema: {
      type: 'object',
      properties: {
        y: { type: 'number', description: 'paddle centre, 0 is the top of the court and 300 the bottom' },
      },
      required: ['y'],
    },
    run: (args) => {
      const result = moveAgentPaddle(args.y);
      paint();
      return result;
    },
  },
];
