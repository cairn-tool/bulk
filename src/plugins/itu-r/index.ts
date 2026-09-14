import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  HELD,
  editionsOf,
  itemsFor,
  recUrl,
  recommendationsOf,
  seriesUrl,
  type Edition,
} from "./parse.js";

export interface ItuROptions {
  series?: string[];
  since?: string;
  status?: "in-force" | "superseded" | "all";
}

/** A page from the cache, else fetched (and decoded as Windows-1252, which is what the site serves). */
async function page(ctx: FetchContext, cache: string, name: string, url: string): Promise<string> {
  const file = path.join(cache, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 1000)
    return new TextDecoder("windows-1252").decode(fs.readFileSync(file));
  const response = await ctx.http.request({
    url,
    accept: "text/html",
    timeoutMs: 120_000,
    signal: ctx.signal,
  });
  const bytes = await response.bytes();
  await ctx.sleep(Math.min(ctx.delay, 5));
  if (response.status !== 200) return "";
  fs.writeFileSync(file, bytes);
  return new TextDecoder("windows-1252").decode(bytes);
}

async function crawl(ctx: FetchContext, series: string[]): Promise<Edition[]> {
  const cache = path.join(ctx.dest, "_pages");
  fs.mkdirSync(cache, { recursive: true });
  const rows: Edition[] = [];
  for (const s of series) {
    const list = await page(ctx, cache, `list-${s}.html`, seriesUrl(s));
    const recs = recommendationsOf(s, list);
    ctx.log.info(`  ${s}: ${recs.length} recommendations`);
    for (let i = 0; i < recs.length; i++) {
      if (ctx.signal.aborted) break;
      rows.push(
        ...editionsOf(s, recs[i], await page(ctx, cache, `${recs[i]}.html`, recUrl(recs[i]))),
      );
      if ((i + 1) % 25 === 0) ctx.log.info(`    ${i + 1}/${recs.length}`);
    }
  }
  writeTsv(path.join(ctx.dest, "_editions.tsv"), rows as unknown as Record<string, unknown>[], [
    "series",
    "rec",
    "edition_id",
    "date",
    "title",
    "status",
  ]);
  fs.writeFileSync(
    path.join(ctx.dest, manifest.fetch!.catalogueFile),
    JSON.stringify(rows),
    "utf-8",
  );
  return rows;
}

export const itur: FetchSystem<ItuROptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const series = (opts.series?.length ? opts.series : HELD).map((s) => s.toUpperCase());
    ctx.log.info(`ITU-R: crawling ${series.length} series (pages cached in _pages/)`);
    const rows = ctx.listFile
      ? (JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as Edition[])
      : await crawl(ctx, series);
    const since = (opts.since ?? "").replace(/-/g, "");
    const status = opts.status ?? "all";
    const selected = rows.filter(
      (r) =>
        r.date >= since &&
        (status === "all" ||
          (status === "in-force") === r.status.toLowerCase().startsWith("in force")),
    );
    return {
      items: itemsFor(selected),
      records: selected as unknown as Record<string, unknown>[],
      summary: [`${rows.length} editions; ${selected.length} selected`],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: itur as FetchSystem<never> };
