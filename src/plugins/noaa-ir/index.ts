import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { human } from "../../text/bytes.js";
import { COLLECTIONS, manifest } from "./manifest.js";
import { BASE, itemsFor, type NoaaDoc } from "./parse.js";

export interface NoaaOptions {
  collection?: string[];
  type?: string[];
  from?: string;
  until?: string;
}

async function fetchCollection(
  ctx: FetchContext,
  pid: string,
  opts: NoaaOptions,
): Promise<NoaaDoc[]> {
  const file = path.join(ctx.dest, `_noaa-${pid}.json`);
  if (ctx.listFile)
    return (JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as { response: { docs: NoaaDoc[] } })
      .response.docs;
  const params = new URLSearchParams({ rows: "1" });
  if (opts.from) params.set("from", `${opts.from}T00:00:00Z`);
  if (opts.until) params.set("until", `${opts.until}T23:59:59Z`);
  const base = `${BASE}/fedora/export/view/collection/noaa:${pid}`;
  // The API serves text/plain; an Accept: application/json header gets a 406.
  const probe = await ctx.http.request({
    url: `${base}?${params}`,
    accept: "*/*",
    timeoutMs: 120_000,
    signal: ctx.signal,
  });
  const probeText = await probe.text();
  if (probe.status !== 200)
    throw new Error(`collection ${pid}: HTTP ${probe.status} ${probeText.slice(0, 100)}`);
  const n = (JSON.parse(probeText) as { response: { numFound: number } }).response.numFound;
  params.set("rows", String(Math.max(n, 1)));
  await ctx.sleep(Math.min(ctx.delay, 2));
  ctx.log.info(`  collection ${pid} (${COLLECTIONS[pid] ?? "?"}): ${n} items …`);
  const full = await ctx.http.request({
    url: `${base}?${params}`,
    accept: "*/*",
    timeoutMs: 600_000,
    signal: ctx.signal,
  });
  const text = await full.text();
  if (full.status !== 200) throw new Error(`collection ${pid}: HTTP ${full.status}`);
  fs.writeFileSync(file, text, "utf-8");
  const docs = (JSON.parse(text) as { response: { docs: NoaaDoc[] } }).response.docs;
  ctx.log.info(`  ${docs.length} fetched`);
  return docs;
}

export const ir: FetchSystem<NoaaOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!opts.collection?.length) throw new Error("select a collection with --collection PID");
    const items: Item[] = [];
    const seen = new Set<string>();
    for (const pid of opts.collection) {
      const name = COLLECTIONS[pid] ?? `noaa-${pid}`;
      const docs = await fetchCollection(ctx, pid, opts);
      // Items are shared across collections; each is pulled once.
      for (const it of itemsFor(docs, name, opts.type)) {
        if (seen.has(String(it.extra.pid))) continue;
        seen.add(String(it.extra.pid));
        items.push(it);
      }
      await ctx.sleep(Math.min(ctx.delay, 2));
    }
    const types = new Map<string, number>();
    for (const it of items)
      types.set(String(it.extra.type), (types.get(String(it.extra.type)) ?? 0) + 1);
    const byType = [...types.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k || "?"} ${v}`)
      .join(", ");
    return {
      items,
      summary: [
        `${items.length} items with a file, ${human(items.reduce((n, it) => n + (it.bytes ?? 0), 0))}; by type: ${byType}`,
      ],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: ir as FetchSystem<never> };
