import fs from "node:fs";
import path from "node:path";
import { buildFetchContext, buildQueryContext } from "../../src/plugin/context.js";
import type { BulkPlugin, FetchPlan, FetchSystem, QueryService } from "../../src/plugin/types.js";
import { runItems, type RunOutcome } from "../../src/pull/run.js";
import { QueryCache } from "../../src/query/cache.js";
import { resolveKeys, type QueryResults } from "../../src/query/resolve.js";
import type { SourceServer } from "./source-server.js";
import { tempEnv, testRuntime } from "./env.js";

const silent = { write: () => undefined, isTTY: false };

/** Runs one plugin in-process against a fixture server, with a throwaway environment. */
export class PluginHarness {
  readonly env = tempEnv();
  readonly dest: string;
  readonly logs: string[] = [];

  constructor(
    readonly plugin: BulkPlugin,
    readonly server: SourceServer,
    private readonly config: Record<string, unknown> = {},
  ) {
    this.dest = path.join(this.env.dir, "dest");
    fs.mkdirSync(this.dest, { recursive: true });
  }

  private runtime() {
    return testRuntime({
      hosts: this.server.hosts,
      cacheDir: path.join(this.env.dir, "cache"),
      config: this.config as never,
    });
  }

  async plan(
    opts: Record<string, unknown> = {},
    extra: { limit?: number; listFile?: string } = {},
  ): Promise<FetchPlan> {
    const { ctx, jars } = buildFetchContext({
      pluginId: this.plugin.manifest.id,
      runtime: this.runtime(),
      stream: { write: (t: string) => this.logs.push(t), isTTY: false },
      delay: 0,
      dest: this.dest,
      limit: extra.limit ?? 0,
      listFile: extra.listFile,
    });
    try {
      return await (this.plugin.fetch as FetchSystem<Record<string, unknown>>).plan(ctx, opts);
    } finally {
      jars.close();
    }
  }

  async fetch(
    opts: Record<string, unknown> = {},
    extra: { limit?: number } = {},
  ): Promise<{ plan: FetchPlan; outcome: RunOutcome }> {
    const { ctx, jars } = buildFetchContext({
      pluginId: this.plugin.manifest.id,
      runtime: this.runtime(),
      stream: { write: (t: string) => this.logs.push(t), isTTY: false },
      delay: 0,
      dest: this.dest,
      limit: extra.limit ?? 0,
    });
    try {
      const system = this.plugin.fetch as FetchSystem<Record<string, unknown>>;
      const plan = await system.plan(ctx, opts);
      const items = ctx.limit ? plan.items.slice(0, ctx.limit) : plan.items;
      let outcome = await runItems(ctx.http, items, this.dest, {
        delay: 0,
        jar: (id) => ctx.jar(id),
      });
      if (system.postRun) outcome = await system.postRun(ctx, opts, plan, outcome);
      return { plan, outcome };
    } finally {
      jars.close();
    }
  }

  async query(
    keys: string[],
    opts: Record<string, unknown> = {},
    cacheFile?: string,
  ): Promise<QueryResults> {
    const { ctx, jars } = buildQueryContext({
      pluginId: this.plugin.manifest.id,
      runtime: this.runtime(),
      stream: silent,
      quiet: true,
      delay: 0,
    });
    try {
      const service = this.plugin.query as QueryService<Record<string, unknown>>;
      const normalized = keys
        .map((k) => service.normalize(k, opts))
        .filter((k): k is string => k !== null);
      const results = await resolveKeys(normalized, (batch) => service.lookup(batch, ctx, opts), {
        cache: new QueryCache(cacheFile),
        batchSize: this.plugin.manifest.query!.batchSize,
      });
      if (service.enrich) await service.enrich(results, ctx, opts);
      return results;
    } finally {
      jars.close();
    }
  }

  files(): string[] {
    const out: string[] = [];
    const walk = (dir: string, rel: string): void => {
      for (const entry of fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const r = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(path.join(dir, entry.name), r);
        else out.push(r);
      }
    };
    walk(this.dest, "");
    return out;
  }

  cleanup(): void {
    this.env.cleanup();
  }
}
