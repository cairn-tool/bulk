import type { OutputFormat } from "../types.js";

export type JsonSchema = Record<string, unknown>;

export interface SchemaEntry {
  /** CLI-facing id, e.g. "fetch-result". */
  id: string;
  /** Canonical `$id` embedded in the document. */
  uri: string;
  title: string;
  /** Command ids that emit this shape. */
  commands: string[];
  schema: JsonSchema;
}

export type ContractStream = "stdout" | "stderr";

export interface ExitCodeMeaning {
  code: 0 | 1 | 2 | 130;
  meaning: string;
}

export interface CommandContract {
  /** Space-joined command path, e.g. "ntsb-reports fetch". */
  id: string;
  /** Accepted output formats, or null when the command speaks a protocol rather than writing a payload. */
  formats: readonly OutputFormat[] | null;
  defaultFormat: OutputFormat | null;
  /** True when the user configuration may override the format for this command. */
  formatConfigurable: boolean;
  /** Schema id for `--format json`, or `null` when none is published. */
  outputSchema: string | null;
  exitCodes: ExitCodeMeaning[];
  /** Which stream carries the primary payload. */
  stream: { success: ContractStream };
  /** True when the command may write files outside its own cache. */
  writes: boolean;
  /** True when the command talks to a remote host. */
  network: boolean;
  stability: "stable" | "experimental";
  notes?: string;
}
