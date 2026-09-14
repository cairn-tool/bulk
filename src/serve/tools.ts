import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildFetchContext, buildQueryContext } from "../plugin/context.js";
import { coerceOptions, optionsToJsonSchema } from "../plugin/options.js";
import type { FetchSystem, PluginManifest, QueryService } from "../plugin/types.js";
import { loadPlugin, manifests } from "../plugins/index.js";
import { manifestRow } from "../pull/manifest.js";
import { QueryCache } from "../query/cache.js";
import { resolveKeys } from "../query/resolve.js";
import { commandsOf } from "../commands/sources.js";
import type { ServeTool } from "./types.js";

const silent = { write: () => undefined, isTTY: false };

function toolName(manifest: PluginManifest, kind: "list" | "query"): string {
  return `${manifest.id.replace(/-/g, "_")}_${kind}`;
}

function listTool(manifest: PluginManifest): ServeTool {
  const fetch = manifest.fetch!;
  const schema = optionsToJsonSchema(fetch.options) as { properties: Record<string, unknown> };
  schema.properties.limit = {
    type: "integer",
    minimum: 0,
    description: "Stop after N rows (default 200; 0 for all)",
  };
  return {
    name: toolName(manifest, "list"),
    description: `${manifest.name}: enumerate the catalogue without downloading anything. ${fetch.description.split("\n")[0]}`,
    inputSchema: schema as ServeTool["inputSchema"],
    handler: async (args, context) => {
      const plugin = await loadPlugin(manifest.id);
      const system = plugin.fetch as FetchSystem<Record<string, unknown>>;
      const opts = coerceOptions<Record<string, unknown>>(fetch.options, args);
      const limit = typeof args.limit === "number" ? args.limit : 200;
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `bulk-serve-${manifest.id}-`));
      const { ctx, jars } = buildFetchContext({
        pluginId: manifest.id,
        runtime: context.runtime,
        stream: silent,
        quiet: true,
        delay: Math.min(
          context.runtime.config.plugins[manifest.id]?.delay ?? context.runtime.config.delay,
          1,
        ),
        dest: scratch,
        limit,
      });
      try {
        const plan = await system.plan(ctx, opts);
        const rows = plan.records ?? plan.items.map(manifestRow);
        return {
          plugin: manifest.id,
          count: rows.length,
          truncated: limit > 0 && rows.length > limit,
          summary: plan.summary,
          warnings: plan.warnings ?? [],
          rows: limit ? rows.slice(0, limit) : rows,
        };
      } finally {
        jars.close();
        fs.rmSync(scratch, { recursive: true, force: true });
      }
    },
  };
}

function queryTool(manifest: PluginManifest): ServeTool {
  const query = manifest.query!;
  const schema = optionsToJsonSchema(query.options) as {
    properties: Record<string, unknown>;
    required?: string[];
  };
  schema.properties.keys = {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    description: `${query.keyLabel}s to look up`,
  };
  schema.required = ["keys"];
  return {
    name: toolName(manifest, "query"),
    description: `${manifest.name}: look ${query.keyLabel}s up. ${query.description.split("\n")[0]}`,
    inputSchema: schema as ServeTool["inputSchema"],
    handler: async (args, context) => {
      const plugin = await loadPlugin(manifest.id);
      const service = plugin.query as QueryService<Record<string, unknown>>;
      const opts = coerceOptions<Record<string, unknown>>(query.options, args);
      const { ctx, jars } = buildQueryContext({
        pluginId: manifest.id,
        runtime: context.runtime,
        stream: silent,
        quiet: true,
        delay:
          context.runtime.config.plugins[manifest.id]?.delay ?? context.runtime.config.query.delay,
      });
      try {
        const keys: string[] = [];
        const skipped: string[] = [];
        for (const raw of args.keys as string[]) {
          const key = service.normalize(raw, opts);
          if (key === null) skipped.push(raw);
          else if (!keys.includes(key)) keys.push(key);
        }
        const results = await resolveKeys(keys, (batch) => service.lookup(batch, ctx, opts), {
          cache: new QueryCache(),
          batchSize: query.batchSize,
          delay: ctx.delay,
        });
        if (service.enrich) await service.enrich(results, ctx, opts);
        return { plugin: manifest.id, total: keys.length, skipped, results };
      } finally {
        jars.close();
      }
    },
  };
}

const listSources: ServeTool = {
  name: "list_sources",
  description: "Every registered data source plugin, its commands, and the hosts it talks to.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: () => ({
    plugins: manifests().map((m) => ({
      id: m.id,
      name: m.name,
      summary: m.summary,
      commands: commandsOf(m),
      tools: [
        ...(m.fetch ? [toolName(m, "list")] : []),
        ...(m.query ? [toolName(m, "query")] : []),
      ],
      hosts: m.hosts.map((h) => h.host),
    })),
  }),
};

/**
 * The tool table: one `list` tool per plugin with a catalogue and one `query`
 * tool per plugin with a lookup. Nothing here downloads a file — `fetch` is
 * CLI-only, and `tests/unit/serve-tools.test.ts` keeps it that way.
 */
export const SERVE_TOOLS: readonly ServeTool[] = [
  listSources,
  ...manifests().flatMap((m) => [
    ...(m.fetch ? [listTool(m)] : []),
    ...(m.query ? [queryTool(m)] : []),
  ]),
];

export const TOOL_BY_NAME: ReadonlyMap<string, ServeTool> = new Map(
  SERVE_TOOLS.map((tool) => [tool.name, tool]),
);
