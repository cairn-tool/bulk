import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { human } from "../../text/bytes.js";
import { manifest } from "./manifest.js";
import { LIST_URL, buildItems, parseList } from "./parse.js";

export interface ReportsOptions {
  mode?: string[];
}

async function fetchList(ctx: FetchContext): Promise<{ raw: string; warnings: string[] }> {
  const file = ctx.listFile ?? path.join(ctx.dest, manifest.fetch!.catalogueFile);
  if (!ctx.listFile) {
    ctx.log.info(`Fetching the Reports list -> ${file}`);
    const response = await ctx.http.request({
      url: LIST_URL,
      accept: "application/json; odata=verbose",
      timeoutMs: 120_000,
      signal: ctx.signal,
    });
    if (response.status !== 200 || !response.contentType.includes("json"))
      throw new Error(`Reports list fetch failed: HTTP ${response.status} ${response.contentType}`);
    fs.writeFileSync(file, await response.text(), "utf-8");
  }
  return { raw: fs.readFileSync(file, "utf-8"), warnings: [] };
}

function summarise(items: readonly Item[]): string[] {
  const byMode = new Map<string, { n: number; bytes: number }>();
  for (const it of items) {
    const mode = String(it.extra.mode);
    const entry = byMode.get(mode) ?? { n: 0, bytes: 0 };
    entry.n++;
    entry.bytes += it.bytes ?? 0;
    byMode.set(mode, entry);
  }
  const lines = [
    `${items.length} reports listed, ${human(items.reduce((n, it) => n + (it.bytes ?? 0), 0))}`,
  ];
  for (const [mode, { n, bytes }] of [...byMode.entries()].sort())
    lines.push(`  ${mode.padEnd(13)} ${String(n).padStart(5)}  ${human(bytes).padStart(10)}`);
  return lines;
}

export const reports: FetchSystem<ReportsOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const { raw } = await fetchList(ctx);
    const { items: listItems, paged } = parseList(raw);
    const warnings = paged
      ? ["the list is paged (__next present); only the first page was taken"]
      : [];
    const all = buildItems(listItems);
    const modes = opts.mode ?? [];
    const selected = modes.length ? all.filter((it) => modes.includes(String(it.extra.mode))) : all;
    return { items: selected, manifestItems: all, summary: summarise(selected), warnings };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: reports as FetchSystem<never> };
