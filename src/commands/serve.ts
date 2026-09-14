import { runtime } from "../runtime.js";
import { serveStdio } from "../serve/server.js";

export const PROTOCOLS = ["mcp"] as const;

/** `bulk serve mcp` — the plugins' list and query commands as MCP tools over stdio. */
export async function serveAction(protocol: string | undefined): Promise<void> {
  if (!protocol || !(PROTOCOLS as readonly string[]).includes(protocol))
    throw new Error(`Unknown protocol: ${protocol ?? ""}. Supported: ${PROTOCOLS.join(", ")}`);
  await serveStdio({ runtime: runtime() });
}
