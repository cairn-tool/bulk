import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { terminate } from "../command-result.js";
import { resolveFormat, type FormatOptions } from "../formatters.js";
import { buildFetchContext } from "../plugin/context.js";
import { LIST_COMMON, coerceOptions } from "../plugin/options.js";
import type { FetchCommonOptions, FetchSystem, PluginManifest } from "../plugin/types.js";
import { loadPlugin } from "../plugins/index.js";
import { manifestRow } from "../pull/manifest.js";
import { renderTable, writeRowsTsv } from "../query/emit.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";
import { fetchDelay, interruptSignal } from "./fetch.js";

export interface ListActionOptions extends FormatOptions, FetchCommonOptions {
  quiet?: boolean;
  [key: string]: unknown;
}

/**
 * `bulk <plugin> list` — the catalogue, with the same selection options as
 * `fetch`, and nothing downloaded. The plugin's `plan()` runs in a temporary
 * destination (its raw catalogue snapshot and records land there and are
 * removed), unless `--dest` names where the snapshot should be kept.
 */
export async function listAction(manifest: PluginManifest, raw: ListActionOptions): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(raw, rt.config.output.format);
  const plugin = await loadPlugin(manifest.id);
  const system = plugin.fetch as FetchSystem<Record<string, unknown>> | undefined;
  if (!manifest.fetch || !system) throw new Error(`${manifest.id} has no list command`);
  const opts = coerceOptions<ListActionOptions>(
    [...manifest.fetch.options, ...LIST_COMMON],
    raw,
    rt.config.plugins[manifest.id]?.options,
  );
  const scratch = opts.dest
    ? path.resolve(opts.dest)
    : fs.mkdtempSync(path.join(os.tmpdir(), `bulk-${manifest.id}-list-`));
  fs.mkdirSync(scratch, { recursive: true });
  const quiet = format === "json" || Boolean(opts.quiet);
  const { ctx, jars } = buildFetchContext({
    pluginId: manifest.id,
    runtime: rt,
    stream: process.stderr,
    quiet,
    signal: interruptSignal(),
    delay: fetchDelay(manifest.id, opts.delay),
    dest: scratch,
    limit: opts.limit ?? 0,
    listFile: opts.listFile,
  });
  const command = `${manifest.id} list`;
  try {
    const plan = await system.plan(ctx, opts);
    const rows = plan.records ?? plan.items.map(manifestRow);
    const limited = ctx.limit ? rows.slice(0, ctx.limit) : rows;
    const columns = plan.listColumns ?? manifest.fetch.listColumns;
    if (format === "json") {
      process.stdout.write(
        jsonPayload(
          command,
          {
            plugin: manifest.id,
            count: limited.length,
            summary: plan.summary,
            warnings: plan.warnings ?? [],
            rows: limited,
          },
          raw,
        ),
      );
    } else if (opts.tsv) {
      writeRowsTsv(opts.tsv, limited, columns);
      process.stdout.write(`${limited.length} rows -> ${opts.tsv}\n`);
    } else {
      process.stdout.write(renderTable(limited, columns));
      for (const line of plan.summary) process.stdout.write(line + "\n");
    }
    for (const line of plan.warnings ?? []) ctx.log.warn(`warning: ${line}`);
    if (ctx.signal.aborted) terminate(130);
  } finally {
    jars.close();
    if (!opts.dest) fs.rmSync(scratch, { recursive: true, force: true });
  }
}
