import { agentMayAct } from '../state';
import { logCall } from '../log';
import type { ToolDef } from '../types';

export const wrapText = (v: unknown): { content: { type: 'text'; text: string }[] } => ({
  content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }],
});

export const NOT_TURN = { ok: false, reason: "it's not your turn, wait for the human to play" };

export const guard =
  (fn: (args: Record<string, unknown>) => unknown) =>
  (args: Record<string, unknown>): unknown =>
    agentMayAct() ? fn(args) : NOT_TURN;

export function toolDef(t: ToolDef): ModelContextTool {
  return {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations || {},
    execute: async (args = {}) => {
      const out = await t.run(args);
      logCall(t.name, args, out);
      return wrapText(out);
    },
  };
}
