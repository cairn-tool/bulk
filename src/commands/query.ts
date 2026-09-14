import path from "node:path";
import { terminate } from "../command-result.js";
import { resolveFormat, type FormatOptions } from "../formatters.js";
import { buildQueryContext } from "../plugin/context.js";
import { QUERY_COMMON, coerceOptions } from "../plugin/options.js";
import type { PluginManifest, QueryService } from "../plugin/types.js";
import { loadPlugin } from "../plugins/index.js";
import { QueryCache } from "../query/cache.js";
import { foundCount, queryRows, renderTable, writeRowsTsv } from "../query/emit.js";
import { readKeys } from "../query/keys.js";
import { isFound, resolveKeys } from "../query/resolve.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";
import { interruptSignal } from "./fetch.js";

export interface QueryActionOptions extends FormatOptions {
  from?: string;
  cache?: string;
  noCache?: boolean;
  refresh?: boolean;
  delay?: number;
  tsv?: string;
  quiet?: boolean;
  [key: string]: unknown;
}

/** The cache file for a query: `--cache`, else the plugin's configured cache, else none. */
export function queryCacheFile(
  pluginId: string,
  flag: string | undefined,
  noCache: boolean | undefined,
): string | undefined {
  if (noCache) return undefined;
  if (flag) return path.resolve(flag);
  const config = runtime().config;
  const configured = config.plugins[pluginId]?.cache;
  if (configured === true) return path.join(config.cacheDir, "query", `${pluginId}.json`);
  if (typeof configured === "string") return path.resolve(configured);
  return undefined;
}

/**
 * `bulk <plugin> query` — identifiers in, records out, through the cache.
 * Exit 2 when no key was found, 1 when there was nothing valid to look up.
 */
export async function queryAction(
  manifest: PluginManifest,
  keysArg: string[],
  raw: QueryActionOptions,
): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(raw, rt.config.output.format);
  const plugin = await loadPlugin(manifest.id);
  const service = plugin.query as QueryService<Record<string, unknown>> | undefined;
  if (!manifest.query || !service) throw new Error(`${manifest.id} has no query command`);
  const opts = coerceOptions<QueryActionOptions>(
    [...manifest.query.options, ...QUERY_COMMON],
    raw,
    rt.config.plugins[manifest.id]?.options,
  );
  const quiet = format === "json" || Boolean(opts.quiet);
  const { ctx, jars } = buildQueryContext({
    pluginId: manifest.id,
    runtime: rt,
    stream: process.stderr,
    quiet,
    signal: interruptSignal(),
    delay: opts.delay ?? rt.config.plugins[manifest.id]?.delay ?? rt.config.query.delay,
  });
  const command = `${manifest.id} query`;
  try {
    const rawKeys = readKeys(keysArg, opts.from);
    if (service.expandKeys) rawKeys.push(...(await service.expandKeys(ctx, opts)));
    const keys: string[] = [];
    const skipped: string[] = [];
    for (const key of rawKeys) {
      const normalized = service.normalize(key, opts);
      if (normalized === null) skipped.push(key);
      else if (!keys.includes(normalized)) keys.push(normalized);
    }
    for (const bad of skipped)
      ctx.log.info(`not a valid ${manifest.query.keyLabel}, skipped: ${bad}`);
    if (!keys.length) {
      if (format === "json")
        process.stdout.write(
          jsonPayload(
            command,
            { plugin: manifest.id, total: 0, found: 0, skipped, results: {} },
            raw,
            { exitCode: 1 },
          ),
        );
      else process.stdout.write("nothing to look up\n");
      terminate(1);
    }
    const cache = new QueryCache(queryCacheFile(manifest.id, opts.cache, opts.noCache));
    const results = await resolveKeys(keys, (batch) => service.lookup(batch, ctx, opts), {
      cache,
      refresh: opts.refresh,
      batchSize: manifest.query.batchSize,
      delay: ctx.delay,
      stream: ctx.stream,
      describe: service.describe,
      signal: ctx.signal,
    });
    if (service.enrich) await service.enrich(results, ctx, opts);
    const columns = service.columns ? service.columns(opts) : manifest.query.columns;
    const rows = queryRows(results, columns);
    const found = foundCount(results);
    const exitCode = ctx.signal.aborted ? 130 : found ? 0 : 2;
    if (format === "json") {
      process.stdout.write(
        jsonPayload(
          command,
          { plugin: manifest.id, total: keys.length, found, skipped, results },
          raw,
          { exitCode },
        ),
      );
    } else if (opts.tsv) {
      writeRowsTsv(opts.tsv, rows, columns);
      process.stdout.write(
        `${rows.length} rows -> ${opts.tsv}\n${found} of ${keys.length} found\n`,
      );
    } else {
      process.stdout.write("\n" + renderTable(rows, columns));
      if (service.details) {
        for (const [key, result] of Object.entries(results)) {
          if (!isFound(result)) continue;
          const lines = service.details(key, result, opts);
          if (lines?.length)
            process.stdout.write(`\n${key}\n${lines.map((l) => `  ${l}`).join("\n")}\n`);
        }
      }
      process.stdout.write(`\n${found} of ${keys.length} found\n`);
    }
    if (exitCode) terminate(exitCode);
  } finally {
    jars.close();
  }
}
