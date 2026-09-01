import { paint } from '../controller';
import { moveAgentPaddle } from './actions';
import { awaitApproach } from './agent';
import { boardText, briefing } from './query';
import { setAgentReady } from './state';
import { paintReady, start } from './ready';
import type { ToolDef } from '../types';

// Note there is no guard() here, unlike the other two games. Pong is real-time:
// there are no turns to be out of, and the agent's paddle is its own at all
// times. The rules it *can* break — moving in single player, moving after the
// round is over, sending a non-number — are enforced inside moveAgentPaddle.
export const PONG_TOOLS: ToolDef[] = [
  {
    name: 'pong_ready',
    description:
      'CALL THIS FIRST, before any other pong tool. It tells you which paddle is yours and how the rally loop works — and it SERVES THE FIRST BALL, so the round starts the moment you call it. Nothing moves until you do. Read what it returns, then go straight into the pong_read / pong_move loop.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      setAgentReady(true);
      paintReady();
      // Checking in *is* the start signal: the ball is the agent's to serve, so
      // there is no button for the human to press. start() serves and repaints.
      start();
      return briefing();
    },
  },
  {
    name: 'pong_state',
    description:
      'The court right now, as text, without waiting for anything. Use it to get your bearings; use pong_read to actually play. ' +
      'You are the BLUE paddle on the left; the human is the RED one on the right. Play ONLY through these three tools — never move the mouse, click, drag, press keys, or take a screenshot of this page. The mouse and the arrow keys belong to the human player, and using them plays their paddle for them instead of yours.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => boardText(),
  },
  {
    name: 'pong_read',
    description:
      'Your only way to see the ball, and the only input you need: do not screenshot, click, or move the mouse to play Pong — pong_read plus pong_move is the whole game. ' +
      "Waits for the ball, then tells you exactly where to be. THIS CALL DOES NOT ANSWER IMMEDIATELY: it blocks until the ball is heading at your side of the court, then returns `intercept_y` — the y where the ball will actually reach your paddle, with the wall bounces already worked out. While you decide, the page slows the ball to a crawl so a round-trip to you fits inside the rally. " +
      "PLAY IT AS A LOOP, ALL IN ONE TURN, WITHOUT STOPPING TO REPORT BETWEEN SHOTS: call pong_read, then immediately call pong_move with the `intercept_y` it gave you, then call pong_read again, and keep going until a result comes back with `round_over: true`. Every result names the next call in `next_action` — make it straight away. Writing the user a progress report mid-rally leaves your paddle standing still and loses the round; say nothing until it is over. " +
      "`event` says what woke you: 'approaching' means play the shot now; 'waiting_for_start' means the round has not been served yet, so call pong_ready to start it; 'timeout' means nothing came at you in time, call pong_read again; 'round_over' or 'not_a_duel' means stop looping. " +
      'If this call fails outright instead of answering, the game was switched out from under it and these tools no longer exist — call get_match rather than retrying.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: () => awaitApproach(),
  },
  {
    name: 'pong_move',
    description:
      'Moves YOUR paddle — the blue one on the left. This is the only way to move it; dragging on the page moves the human\'s paddle, not yours. ' +
      'Puts the centre of your paddle at y and lets the ball go back to full speed. Pass the `intercept_y` you just got from pong_read to return the shot. y is clamped to the court, so an out-of-range value is pinned rather than rejected. CALL pong_read AGAIN IMMEDIATELY AFTER THIS — the rally is still running and the next shot is already on its way.',
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
