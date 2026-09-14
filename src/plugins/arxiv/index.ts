import fs from "node:fs";
import path from "node:path";
import { RateLimited } from "../../http/errors.js";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  API,
  PAGE,
  RECORD_COLUMNS,
  buildQuery,
  itemsFor,
  parseFeed,
  type ArxivRecord,
  type QueryParts,
} from "./parse.js";

export interface ArxivOptions extends QueryParts {
  id?: string[];
  sort?: string;
  order?: string;
  source?: boolean;
  withSource?: boolean;
}

async function fetchFeed(
  ctx: FetchContext,
  params: URLSearchParams,
  page: number,
): Promise<string> {
  const dir = path.join(ctx.dest, "_feed");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `page${page}.xml`);
  if (ctx.listFile && page === 1) return fs.readFileSync(ctx.listFile, "utf-8");
  // arXiv's 429 carries no Retry-After and the block outlasts a retry: it is reported, not retried.
  const response = await ctx.http.request({
    url: `${API}?${params}`,
    accept: "application/atom+xml",
    timeoutMs: 180_000,
    signal: ctx.signal,
    retries: 0,
  });
  const text = await response.text();
  if (response.status === 429) throw new RateLimited("export.arxiv.org", `${API}?${params}`);
  if (response.status !== 200 || !text.trimStart().startsWith("<"))
    throw new Error(
      `arXiv API: HTTP ${response.status} — ${text.trim().slice(0, 80)}\narXiv blocks bursts for a while; wait a few minutes and re-run.`,
    );
  fs.writeFileSync(file, text, "utf-8");
  return text;
}

async function search(
  ctx: FetchContext,
  query: string,
  ids: string[],
  opts: ArxivOptions,
): Promise<ArxivRecord[]> {
  const records: ArxivRecord[] = [];
  let start = 0;
  let page = 0;
  for (;;) {
    page++;
    const want = ctx.limit ? Math.min(PAGE, ctx.limit - records.length) : PAGE;
    const params = new URLSearchParams({ start: String(start), max_results: String(want) });
    if (ids.length) params.set("id_list", ids.join(","));
    else {
      params.set("search_query", query);
      params.set("sortBy", opts.sort ?? "submittedDate");
      params.set("sortOrder", opts.order ?? "descending");
    }
    const { entries, total } = parseFeed(await fetchFeed(ctx, params, page));
    records.push(...entries);
    ctx.log.info(`  ${records.length}${total !== undefined ? ` of ${total}` : ""} paper(s)`);
    if (ids.length || !entries.length || (ctx.limit && records.length >= ctx.limit) || ctx.listFile)
      break;
    if (total !== undefined && records.length >= total) break;
    start += entries.length;
  }
  return ctx.limit ? records.slice(0, ctx.limit) : records;
}

export const papers: FetchSystem<ArxivOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const query = buildQuery(opts);
    if (!query && !opts.id?.length)
      throw new Error(
        "select papers with --id, or a search (--query, --category, --author, --title)",
      );
    const records = await search(ctx, query, opts.id ?? [], opts);
    if (!records.length) return { items: [], summary: [], warnings: ["no papers matched"] };
    const wantPdf = !opts.source || Boolean(opts.withSource);
    const items = itemsFor(records, wantPdf, Boolean(opts.source || opts.withSource));
    writeTsv(
      path.join(ctx.dest, "_papers.tsv"),
      records as unknown as Record<string, unknown>[],
      RECORD_COLUMNS,
    );
    return {
      items,
      records: records as unknown as Record<string, unknown>[],
      summary: [`${records.length} papers, ${items.length} files`],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: papers as FetchSystem<never> };
