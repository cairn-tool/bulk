import os from "node:os";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CommandExit } from "../command-result.js";

/** Rewrites the home directory out of a message before it reaches the client. */
export function scrub(message: string): string {
  const home = os.homedir();
  return home ? message.split(home).join("~") : message;
}

/**
 * Maps a thrown error to a tool result the model can act on: a source that
 * answered badly or a key that does not parse is the model's to correct, so it
 * comes back as `isError` content rather than as a JSON-RPC error.
 */
export function toolFailure(error: unknown): CallToolResult {
  const message =
    error instanceof CommandExit
      ? `Command exited with status ${error.exitCode}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { content: [{ type: "text", text: scrub(message) }], isError: true };
}
