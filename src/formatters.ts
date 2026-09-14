import { isOutputFormat } from "./formats.js";
import type { OutputFormat } from "./types.js";

export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const RED = "\x1b[31m";
export const RESET = "\x1b[0m";

export interface FormatOptions {
  format?: string;
  envelope?: boolean;
}

/** The format a command runs under: the flag, else the configured default, else llm. */
export function resolveFormat(opts: FormatOptions, configured: OutputFormat = "llm"): OutputFormat {
  const format = opts.format === undefined ? configured : opts.format;
  if (!isOutputFormat(format)) throw new Error(`Invalid output format: ${format}`);
  if (opts.envelope && format !== "json") throw new Error("--envelope requires --format json");
  return format;
}

export function heading(text: string, human: boolean): string {
  return human ? `${BOLD}${text}${RESET}` : text;
}

export function dim(text: string, human: boolean): string {
  return human ? `${DIM}${text}${RESET}` : text;
}

/** `key: value` lines with the keys padded to one width. */
export function keyValues(pairs: readonly [string, unknown][], human = false): string[] {
  const width = Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(
    ([k, v]) => `${human ? DIM : ""}${k.padEnd(width)}${human ? RESET : ""}  ${String(v ?? "")}`,
  );
}
