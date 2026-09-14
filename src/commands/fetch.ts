import fs from "node:fs";
import path from "node:path";
import { terminate, type ExitStatus } from "../command-result.js";
import { resolveFormat, type FormatOptions } from "../formatters.js";
import { buildFetchContext } from "../plugin/context.js";
import { FETCH_COMMON, coerceOptions } from "../plugin/options.js";
import type {
  FetchCommonOptions,
  FetchPlan,
  FetchSystem,
  PluginManifest,
} from "../plugin/types.js";
import { loadPlugin } from "../plugins/index.js";
import { dryRun } from "../pull/dry-run.js";
import { resolveDest } from "../pull/dest.js";
import { writeManifest } from "../pull/manifest.js";
import { duplicateDests } from "../pull/naming.js";
import { runItems, exitCodeFor, type RunOutcome } from "../pull/run.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";
import { human } from "../text/bytes.js";

export interface FetchActionOptions extends FormatOptions, FetchCommonOptions {
  quiet?: boolean;
  [key: string]: unknown;
}

/** Wires Ctrl-C to one abort signal; a second Ctrl-C exits at once. */
export function interruptSignal(): AbortSignal {
  const controller = new AbortController();
  let count = 0;
  process.on("SIGINT", () => {
    count++;
    if (count > 1) process.exit(130);
    controller.abort();
  });
  return controller.signal;
}

export function fetchDelay(manifestId: string, flag: number | undefined): number {
  const config = runtime().config;
  return flag ?? config.plugins[manifestId]?.delay ?? config.delay;
}

/**
 * `bulk <plugin> fetch` — the one runner behind every catalogue pull.
 *
 * Resolve the destination (refuse without one) → `plan()` → refuse duplicate
 * destinations → write `_manifest.tsv` → `--dry-run` view or the run → the
 * plugin's `postRun` → the payload and the exit code.
 */
export async function fetchAction(
  manifest: PluginManifest,
  raw: FetchActionOptions,
): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(raw, rt.config.output.format);
  const plugin = await loadPlugin(manifest.id);
  const system = plugin.fetch as FetchSystem<Record<string, unknown>> | undefined;
  if (!plugin.fetch || !manifest.fetch || !system)
    throw new Error(`${manifest.id} has no fetch command`);
  const opts = coerceOptions<FetchActionOptions>(
    [...manifest.fetch.options, ...FETCH_COMMON],
    raw,
    rt.config.plugins[manifest.id]?.options,
  );
  const dest = resolveDest(manifest.id, rt.config, opts.dest);
  fs.mkdirSync(dest, { recursive: true });
  const quiet = format === "json" || Boolean(opts.quiet);
  const { ctx, jars } = buildFetchContext({
    pluginId: manifest.id,
    runtime: rt,
    stream: process.stderr,
    quiet,
    signal: interruptSignal(),
    delay: fetchDelay(manifest.id, opts.delay),
    dest,
    limit: opts.limit ?? 0,
    listFile: opts.listFile,
  });
  const command = `${manifest.id} fetch`;
  let plan: FetchPlan;
  let outcome: RunOutcome | null = null;
  let manifestFile: string;
  try {
    plan = await system.plan(ctx, opts);
    const items = ctx.limit ? plan.items.slice(0, ctx.limit) : plan.items;
    const dupes = duplicateDests(items);
    if (dupes.length)
      throw new Error(
        `${manifest.id}: duplicate destinations in the plan: ${dupes.slice(0, 3).join(", ")}`,
      );
    manifestFile = writeManifest(dest, plan.manifestItems ?? items, manifest.fetch.manifestColumns);
    for (const line of plan.summary) ctx.log.info(line);
    for (const line of plan.warnings ?? []) ctx.log.warn(`warning: ${line}`);
    ctx.log.info(`manifest -> ${manifestFile}`);
    ctx.log.info(
      `\n${items.length} to process into ${dest} (${human(items.reduce((n, it) => n + (it.bytes ?? 0), 0))} listed)\n`,
    );
    if (opts.dryRun) {
      if (!quiet) dryRun(items, process.stderr);
    } else {
      outcome = await runItems(rt.http, items, dest, {
        delay: ctx.delay,
        stream: quiet ? undefined : process.stderr,
        signal: ctx.signal,
        jar: (id) => ctx.jar(id),
      });
      if (system.postRun && !outcome.interrupted)
        outcome = await system.postRun(ctx, opts, plan, outcome);
    }
    const exitCode = outcome ? exitCodeFor(outcome) : 0;
    if (format === "json") {
      process.stdout.write(
        jsonPayload(
          command,
          {
            plugin: manifest.id,
            dest,
            manifest: path.relative(dest, manifestFile) || manifestFile,
            dryRun: Boolean(opts.dryRun),
            planned: items.length,
            summary: plan.summary,
            warnings: plan.warnings ?? [],
            outcome,
          },
          raw,
          { exitCode },
        ),
      );
    }
    if (exitCode) terminate(exitCode as ExitStatus);
  } finally {
    jars.close();
  }
}
