import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  knownKeys,
  numberRecord,
  object,
  optionalBoolean,
  optionalNumber,
  optionalString,
  stringRecord,
} from "./config-schema.js";
import { isOutputFormat } from "./formats.js";
import { archiveFromEnv, cacheDir, configPath, type PathEnvironment } from "./paths.js";
import type { OutputFormat } from "./types.js";

/** Per-plugin settings a user may pin in the config file. */
export interface PluginConfig {
  /** Destination for `fetch`; relative paths resolve under `archive`. */
  dest?: string;
  /** Seconds between downloads or requests, overriding the top-level default. */
  delay?: number;
  /** `true` → `<cache>/query/<plugin>.json`; a path → that file; absent → no cache unless --cache. */
  cache?: string | boolean;
  /** Defaults for the plugin's own options, keyed by their camelCase name. */
  options?: Record<string, unknown>;
}

export interface ResolvedConfig {
  /** Where the settings were read from, when a file existed. */
  configPath?: string;
  cacheDir: string;
  archive?: string;
  contact?: string;
  /** Default seconds between downloads. */
  delay: number;
  output: { format: OutputFormat };
  /** Host → base URL rewrites (mirrors, test servers). */
  hosts: Record<string, string>;
  /** Host → minimum seconds between requests, overriding a plugin's declared floor. */
  limits: Record<string, number>;
  plugins: Record<string, PluginConfig>;
  query: { delay: number };
  challenge: { anubis: { enabled: boolean; refreshMargin: number; delay: number } };
}

export const DEFAULT_FETCH_DELAY = 2;
export const DEFAULT_QUERY_DELAY = 0.5;

const ROOT_KEYS = [
  "version",
  "archive",
  "contact",
  "delay",
  "output",
  "hosts",
  "limits",
  "plugins",
  "query",
  "challenge",
] as const;

export function defaultConfig(environment: PathEnvironment = {}): ResolvedConfig {
  return {
    cacheDir: cacheDir(environment),
    archive: archiveFromEnv(environment.env),
    contact: environment.env?.BULK_CONTACT?.trim() || process.env.BULK_CONTACT?.trim() || undefined,
    delay: DEFAULT_FETCH_DELAY,
    output: { format: "llm" },
    hosts: {},
    limits: {},
    plugins: {},
    query: { delay: DEFAULT_QUERY_DELAY },
    challenge: { anubis: { enabled: true, refreshMargin: 600, delay: 1 } },
  };
}

function parsePlugins(value: unknown): Record<string, PluginConfig> {
  if (value === undefined || value === null) return {};
  const record = object(value, "plugins");
  const out: Record<string, PluginConfig> = {};
  for (const [id, raw] of Object.entries(record)) {
    const entry = object(raw, `plugins.${id}`);
    knownKeys(entry, ["dest", "delay", "cache", "options"], `plugins.${id}`);
    const cache = entry.cache;
    if (
      cache !== undefined &&
      cache !== null &&
      typeof cache !== "string" &&
      typeof cache !== "boolean"
    )
      throw new Error(`plugins.${id}.cache must be true, false, or a path`);
    out[id] = {
      dest: optionalString(entry.dest, `plugins.${id}.dest`),
      delay: optionalNumber(entry.delay, `plugins.${id}.delay`),
      cache: cache === null ? undefined : (cache as string | boolean | undefined),
      options:
        entry.options === undefined ? undefined : object(entry.options, `plugins.${id}.options`),
    };
  }
  return out;
}

/**
 * Parses one configuration document over the defaults. Exported separately from
 * `loadConfig` so tests can feed YAML text without touching the filesystem.
 */
export function parseConfig(text: string, environment: PathEnvironment = {}): ResolvedConfig {
  const config = defaultConfig(environment);
  const parsed: unknown = parseYaml(text);
  if (parsed === undefined || parsed === null) return config;
  const root = object(parsed, "config");
  knownKeys(root, ROOT_KEYS, "config");
  if (root.version !== undefined && root.version !== 1)
    throw new Error(`Unsupported config version: ${String(root.version)} (expected 1)`);

  const archive = optionalString(root.archive, "archive");
  // The environment wins over the file for the two values a shell is likely to set per session.
  if (archive && !config.archive) config.archive = path.resolve(archive);
  const contact = optionalString(root.contact, "contact");
  if (contact && !config.contact) config.contact = contact;
  config.delay = optionalNumber(root.delay, "delay") ?? config.delay;

  if (root.output !== undefined) {
    const output = object(root.output, "output");
    knownKeys(output, ["format"], "output");
    if (output.format !== undefined) {
      if (!isOutputFormat(output.format))
        throw new Error(`output.format must be one of llm, human, json`);
      config.output.format = output.format;
    }
  }
  config.hosts = stringRecord(root.hosts, "hosts");
  config.limits = numberRecord(root.limits, "limits");
  config.plugins = parsePlugins(root.plugins);
  if (root.query !== undefined) {
    const query = object(root.query, "query");
    knownKeys(query, ["delay"], "query");
    config.query.delay = optionalNumber(query.delay, "query.delay") ?? config.query.delay;
  }
  if (root.challenge !== undefined) {
    const challenge = object(root.challenge, "challenge");
    knownKeys(challenge, ["anubis"], "challenge");
    if (challenge.anubis !== undefined) {
      const anubis = object(challenge.anubis, "challenge.anubis");
      knownKeys(anubis, ["enabled", "refreshMargin", "delay"], "challenge.anubis");
      config.challenge.anubis = {
        enabled: optionalBoolean(anubis.enabled, "challenge.anubis.enabled") ?? true,
        refreshMargin:
          optionalNumber(anubis.refreshMargin, "challenge.anubis.refreshMargin") ?? 600,
        delay: optionalNumber(anubis.delay, "challenge.anubis.delay") ?? 1,
      };
    }
  }
  return config;
}

/**
 * Loads the user configuration. A missing file is the defaults; a malformed one
 * is an error naming the key, because a silently ignored setting is how a fetch
 * ends up in the wrong place.
 */
export function loadConfig(environment: PathEnvironment = {}): ResolvedConfig {
  const file = configPath(environment);
  if (!fs.existsSync(file)) return defaultConfig(environment);
  let text: string;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${(error as Error).message}`, { cause: error });
  }
  try {
    const config = parseConfig(text, environment);
    config.configPath = file;
    return config;
  } catch (error) {
    throw new Error(`${file}: ${(error as Error).message}`, { cause: error });
  }
}

/** A starter file for `bulk config init`. */
export function templateConfig(): string {
  return [
    "# bulk configuration — https://github.com/cairn-tool/bulk/blob/main/docs/configuration.md",
    "version: 1",
    "",
    "# Root that relative plugin destinations resolve under (or set BULK_ARCHIVE).",
    "# archive: /Volumes/Archives",
    "",
    "# Contact address for the polite User-Agents some APIs reward (Crossref, Open Library, NTRS).",
    "# contact: you@example.com",
    "",
    "# Default seconds between downloads.",
    "delay: 2",
    "",
    "# Per-plugin settings. A fetch refuses to run without a destination here or --dest.",
    "plugins:",
    "  # ntsb-reports:",
    "  #   dest: ntsb/reports          # relative to `archive`, or absolute",
    "  #   delay: 1",
    "  # openlibrary:",
    "  #   cache: true                 # keep answers in <cache>/query/openlibrary.json",
    "",
  ].join("\n");
}
