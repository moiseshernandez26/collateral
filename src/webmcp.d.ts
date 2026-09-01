// Minimal ambient types for the WebMCP origin-trial API used by this app.
// `document.modelContext` is not yet part of lib.dom.d.ts.

interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ModelContextToolAnnotations;
  execute: (args: Record<string, unknown>) => Promise<{ content: { type: 'text'; text: string }[] }>;
}

interface ModelContext {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<unknown>;
  // Read back what the browser actually holds, rather than trusting our own
  // count of what we asked it to register.
  getTools?: () => Promise<{ name: string }[]>;
  // Fires once per tool added or removed, so it needs debouncing before it is
  // worth showing to anyone.
  ontoolchange?: (() => void) | null;
}

interface Document {
  modelContext?: ModelContext;
}

interface Window {
  anime?: ((params: Record<string, unknown>) => unknown) & { stagger: (n: number) => unknown };
}
