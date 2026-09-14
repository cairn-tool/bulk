import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { Progress } from "../../pull/progress.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  RECORD_COLUMNS,
  SEARCH,
  SITEMAP,
  itemUrl,
  keep,
  recordOf,
  searchPage,
  sitemapIds,
  sitemapPages,
  type Narrowing,
  type TreesearchRecord,
} from "./parse.js";

export interface TreesearchOptions extends Narrowing {
  query?: string;
  id?: string[];
  all?: boolean;
  withCitationsOnly?: boolean;
  allPublications?: boolean;
}

/** Walk the search view, collecting publication ids in result order. */
async function searchIds(ctx: FetchContext, query: string, fullOnly: boolean): Promise<string[]> {
  const ids: string[] = [];
  let page = 0;
  let total: number | undefined;
  for (;;) {
    const params = new URLSearchParams({
      text: query,
      is_full_pub: fullOnly ? "1" : "All",
      page: String(page),
    });
    const response = await ctx.http.request({
      url: `${SEARCH}?${params}`,
      accept: "text/html",
      timeoutMs: 120_000,
      signal: ctx.signal,
    });
    if (response.status !== 200) throw new Error(`Treesearch: HTTP ${response.status}`);
    const parsed = searchPage(await response.text());
    total ??= parsed.total;
    const fresh = parsed.ids.filter((i) => !ids.includes(i));
    ids.push(...fresh);
    ctx.log.info(`  ${ids.length}${total ? ` of ${total}` : ""} publication(s)`);
    if (!fresh.length || (ctx.limit && ids.length >= ctx.limit) || (total && ids.length >= total))
      break;
    page++;
    if (ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
  }
  return ctx.limit ? ids.slice(0, ctx.limit) : ids;
}

/** Every publication id, from the sitemap index. */
async function allIds(ctx: FetchContext): Promise<string[]> {
  const response = await ctx.http.request({
    url: SITEMAP,
    accept: "application/xml",
    timeoutMs: 120_000,
    signal: ctx.signal,
  });
  if (response.status !== 200) throw new Error(`Treesearch sitemap: HTTP ${response.status}`);
  const index = await response.text();
  const pages = sitemapPages(index);
  const ids: string[] = [];
  if (!pages.length) ids.push(...sitemapIds(index));
  for (let i = 0; i < pages.length; i++) {
    const r = await ctx.http.request({
      url: pages[i],
      accept: "application/xml",
      timeoutMs: 180_000,
      signal: ctx.signal,
    });
    if (r.status !== 200) {
      ctx.log.info(`  sitemap page ${i + 1}: HTTP ${r.status}, skipped`);
      continue;
    }
    for (const id of sitemapIds(await r.text())) if (!ids.includes(id)) ids.push(id);
    ctx.log.info(`  sitemap ${i + 1}/${pages.length}: ${ids.length} publication(s)`);
    if (ctx.limit && ids.length >= ctx.limit) break;
    if (ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
  }
  return ctx.limit ? ids.slice(0, ctx.limit) : ids;
}

export const treesearch: FetchSystem<TreesearchOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!(opts.query || opts.id?.length || opts.all))
      throw new Error("select publications with --query, --id, or --all");
    let ids = [...(opts.id ?? [])];
    if (ctx.listFile) ids = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as string[];
    else if (opts.all) ids.push(...(await allIds(ctx)).filter((i) => !ids.includes(i)));
    else if (opts.query)
      ids.push(
        ...(await searchIds(ctx, opts.query, !opts.allPublications)).filter(
          (i) => !ids.includes(i),
        ),
      );
    fs.writeFileSync(
      path.join(ctx.dest, manifest.fetch!.catalogueFile),
      JSON.stringify(ids),
      "utf-8",
    );
    if (!ids.length) return { items: [], summary: [], warnings: ["no publications matched"] };

    const progress = new Progress(ids.length, ctx.stream);
    const records: TreesearchRecord[] = [];
    for (let i = 0; i < ids.length; i++) {
      if (ctx.signal.aborted) break;
      const id = ids[i];
      progress.start(i + 1, `treesearch/${id}`);
      const response = await ctx.http.request({
        url: itemUrl(id),
        accept: "text/html",
        timeoutMs: 90_000,
        signal: ctx.signal,
      });
      if (response.status !== 200) {
        progress.finish(`FAIL http ${response.status}`);
      } else {
        const r = recordOf(id, await response.text());
        if (!r.pdf && !opts.withCitationsOnly) progress.finish("skip (no PDF offered)");
        else progress.finish(`${r.year.padEnd(5)} ${r.title.slice(0, 44)}`);
        records.push(r);
      }
      if (i < ids.length - 1 && ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
    }
    const kept = records.filter((r) => keep(r, opts));
    writeTsv(
      path.join(ctx.dest, "_records.tsv"),
      kept as unknown as Record<string, unknown>[],
      RECORD_COLUMNS,
    );
    fs.writeFileSync(path.join(ctx.dest, "_records.json"), JSON.stringify(kept), "utf-8");
    const items: Item[] = [];
    for (const r of kept) {
      if (!r.pdf) continue;
      const folder = safeName(cleanTitle(r.station || "Unattributed"), 60);
      const name = safeName(`${r.id} - ${cleanTitle(r.title)}`);
      items.push({ dest: `${folder}/${name}.pdf`, url: r.pdf, extra: { ...r, list_id: r.id } });
    }
    dedupeDests(items);
    const without = kept.length - items.length;
    return {
      items,
      records: kept as unknown as Record<string, unknown>[],
      summary: [
        `${kept.length} publication(s), ${items.length} with a PDF${without ? `, ${without} citation-only` : ""}`,
      ],
      warnings: kept.length ? [] : ["no publications matched"],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: treesearch as FetchSystem<never> };
