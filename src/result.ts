import { COMMAND_CONTRACTS } from "./contract/registry.js";
import { CONTRACT_VERSION } from "./contract/version.js";
import { schemaUriFor } from "./contract/schemas/index.js";
import { packageName, packageVersion } from "./version.js";

export type ExitCode = 0 | 1 | 2 | 130;

export interface EmitOptions {
  /** Canonical command id, e.g. "ntsb-reports fetch". */
  command: string;
  ok: boolean;
  exitCode: ExitCode;
  envelope?: boolean;
  schema?: string | null;
  summary?: Record<string, unknown>;
}

export interface ResultEnvelope {
  schemaVersion: string;
  tool: { name: string; version: string };
  command: string;
  ok: boolean;
  exitCode: ExitCode;
  schema: string | null;
  data: unknown;
  summary?: Record<string, unknown>;
}

export function wrap(payload: unknown, opts: EmitOptions): ResultEnvelope {
  return {
    schemaVersion: CONTRACT_VERSION,
    tool: { name: packageName, version: packageVersion },
    command: opts.command,
    ok: opts.ok,
    exitCode: opts.exitCode,
    schema: schemaUriFor(opts.schema),
    data: payload,
    ...(opts.summary ? { summary: opts.summary } : {}),
  };
}

/** Without `envelope` the output is byte-identical to `JSON.stringify(payload, null, 2)`. */
export function renderJson(payload: unknown, opts: EmitOptions): string {
  return JSON.stringify(opts.envelope ? wrap(payload, opts) : payload, null, 2) + "\n";
}

export interface Outcome {
  ok?: boolean;
  exitCode?: ExitCode;
  summary?: Record<string, unknown>;
}

/**
 * Renders a command's JSON payload, looking its schema id up in the registry.
 * The single place every `--format json` write goes through, so `--envelope`
 * reaches all of them.
 */
export function jsonPayload(
  command: string,
  payload: unknown,
  opts: { envelope?: boolean },
  outcome: Outcome = {},
): string {
  const exitCode = outcome.exitCode ?? 0;
  return renderJson(payload, {
    command,
    ok: outcome.ok ?? exitCode === 0,
    exitCode,
    envelope: Boolean(opts.envelope),
    schema: COMMAND_CONTRACTS[command]?.outputSchema,
    summary: outcome.summary,
  });
}
