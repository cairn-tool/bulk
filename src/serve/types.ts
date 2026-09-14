import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Runtime } from "../runtime.js";

export interface ServeContext {
  runtime: Runtime;
}

export interface ServeTool {
  name: string;
  description: string;
  inputSchema: Tool["inputSchema"];
  handler: (args: Record<string, unknown>, context: ServeContext) => Promise<unknown> | unknown;
}
