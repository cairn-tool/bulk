import type { ResolvedConfig } from "../config.js";
import type { CookieJar } from "../http/cookie-jar.js";
import type { HttpClient, UaKind } from "../http/types.js";
import type { Item } from "../pull/item.js";
import type { ProgressStream } from "../pull/progress.js";
import type { RunOutcome } from "../pull/run.js";
import type { QueryAnswer, QueryRecord } from "../query/cache.js";
import type { ListColumn } from "../query/emit.js";
import type { QueryResults } from "../query/resolve.js";

export type { Item, ItemRequest } from "../pull/item.js";
export type { ListColumn } from "../query/emit.js";
export type { QueryAnswer, QueryRecord } from "../query/cache.js";
export type { QueryResults } from "../query/resolve.js";
export type { RunOutcome } from "../pull/run.js";

/**
 * One option declaration drives everything that needs to know about an option:
 * commander registration, `describe`, shell completion, the MCP tool schema and
 * the docs completeness test. `name` is the long flag without dashes
 * (`approved-from`); the parsed value lives under its camelCase form.
 */
export type OptionDecl =
  | { kind: "boolean"; name: string; description: string }
  | {
      kind: "string";
      name: string;
      value: string;
      description: string;
      default?: string;
      choices?: readonly string[];
      repeatable?: boolean;
      required?: boolean;
      complete?: "file" | "directory";
    }
  | {
      kind: "integer" | "number";
      name: string;
      value: string;
      description: string;
      default?: number;
      min?: number;
      max?: number;
      repeatable?: boolean;
    }
  | { kind: "tuple"; name: string; values: readonly string[]; description: string };

export interface HostPolicy {
  host: string;
  userAgent: UaKind;
  /** Declared floor in seconds for a host that publishes no rate-limit headers. */
  minInterval?: number;
  /** A bot-challenge solver whose cookie every request to this host carries. */
  challenge?: "anubis";
  timeoutMs?: number;
  /** Surfaces in `bulk sources` and the docs test. */
  note?: string;
}

export interface FetchManifest {
  description: string;
  examples: readonly string[];
  /** The plugin's own selection options; the framework adds the common fetch options. */
  options: readonly OptionDecl[];
  /** Columns of `_manifest.tsv`; `dest`, `url`, `bytes` are always populated from the item. */
  manifestColumns: readonly string[];
  /** How `list` renders the catalogue. */
  listColumns: readonly ListColumn[];
  /** The raw catalogue file the plugin saves in the destination — what `--list-file` replaces. */
  catalogueFile: string;
  /** True when the plugin refuses to run without a selection (a whole-catalogue pull is a crawl, not a command). */
  selectionRequired?: boolean;
  /** Extra guarantees or files written, for the docs. */
  notes?: readonly string[];
}

export interface QueryManifest {
  /** What a key is, for help text: "ISBN", "DOI", "accession number". */
  keyLabel: string;
  description: string;
  examples: readonly string[];
  options: readonly OptionDecl[];
  /** Keys per request. */
  batchSize: number;
  columns: readonly ListColumn[];
}

export interface PluginManifest {
  /** `ntsb-reports` — the command name and the config key. */
  id: string;
  /** "NTSB investigation reports library" */
  name: string;
  /** One line for `bulk sources` and `--help`. */
  summary: string;
  hosts: readonly HostPolicy[];
  fetch?: FetchManifest;
  query?: QueryManifest;
}

export interface FetchCommonOptions {
  dest?: string;
  delay?: number;
  limit?: number;
  listFile?: string;
  dryRun?: boolean;
  tsv?: string;
}

export interface Logger {
  /** Progress and notes; silenced under --format json and --quiet. */
  info(message: string): void;
  /** Always shown, on stderr. */
  warn(message: string): void;
}

export interface FetchContext {
  pluginId: string;
  config: ResolvedConfig;
  http: HttpClient;
  /** Absolute destination, already created. */
  dest: string;
  /** Seconds between requests; catalogue calls may use less. */
  delay: number;
  /** 0 = everything. */
  limit: number;
  listFile?: string;
  log: Logger;
  /** Where progress lines go. */
  stream: ProgressStream;
  /** A named cookie jar: `session:<name>` is per-run, `challenge:<solver>:<host>` is cached on disk. */
  jar(id: string): CookieJar;
  /** Solve a host's bot challenge (if the plugin declared one) and cache its cookie. */
  ensureChallenge(solver: "anubis", url: string): Promise<{ ok: boolean; note: string }>;
  /** Run a second pass of items (CAROL's report PDFs, IETF's fallback stage). */
  run(items: readonly Item[], opts?: { logName?: string }): Promise<RunOutcome>;
  signal: AbortSignal;
  now(): Date;
  sleep(seconds: number): Promise<void>;
}

export interface FetchPlan {
  /** What will be fetched, after selection and `--limit`. */
  items: Item[];
  /** What `_manifest.tsv` records when it should hold more than `items` (a whole catalogue). */
  manifestItems?: Item[];
  /** The catalogue rows behind `list`, when they differ from the items (records without a file). */
  records?: Record<string, unknown>[];
  /** Lines printed after enumeration. */
  summary: string[];
  warnings?: string[];
}

export interface FetchSystem<O = Record<string, unknown>> {
  plan(ctx: FetchContext, opts: O & FetchCommonOptions): Promise<FetchPlan>;
  /** After the run: unzip, a second pass, a report. Returns the outcome to report. */
  postRun?(
    ctx: FetchContext,
    opts: O & FetchCommonOptions,
    plan: FetchPlan,
    outcome: RunOutcome,
  ): Promise<RunOutcome>;
}

export interface QueryContext {
  pluginId: string;
  config: ResolvedConfig;
  http: HttpClient;
  delay: number;
  log: Logger;
  stream: ProgressStream;
  jar(id: string): CookieJar;
  signal: AbortSignal;
  sleep(seconds: number): Promise<void>;
}

export interface QueryService<O = Record<string, unknown>> {
  /** A key as typed → its canonical form, or null when it is not a valid key. */
  normalize(raw: string, opts: O): string | null;
  /** More keys from the options (`--find FILE` extracts ISBNs from text). */
  expandKeys?(ctx: QueryContext, opts: O): Promise<string[]>;
  lookup(keys: string[], ctx: QueryContext, opts: O): Promise<Record<string, QueryAnswer>>;
  /** The right-margin outcome for a found record. */
  describe?(record: QueryRecord): string;
  /** Columns that depend on the options (nist `--resolve` adds the PDF URL). */
  columns?(opts: O): readonly ListColumn[];
  /** A second request per record after the lookup (nist `--resolve`). */
  enrich?(results: QueryResults, ctx: QueryContext, opts: O): Promise<void>;
  /** Extra text lines per record for a flag (`--files`, `--links`, `--abstract`). */
  details?(key: string, record: QueryRecord, opts: O): string[] | undefined;
}

export interface BulkPlugin {
  manifest: PluginManifest;
  fetch?: FetchSystem<never>;
  query?: QueryService<never>;
}

/** A manifest plus the lazy loader of its engine. */
export interface PluginEntry {
  manifest: PluginManifest;
  load: () => Promise<BulkPlugin>;
}
