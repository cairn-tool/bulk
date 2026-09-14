import fs from "node:fs";
import path from "node:path";
import { fetchRecords, ostiIdentifier, type OstiRecord } from "../../clients/osti.js";
import type {
  BulkPlugin,
  FetchContext,
  FetchPlan,
  FetchSystem,
  QueryAnswer,
  QueryService,
} from "../../plugin/types.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  RECORD_COLUMNS,
  buildParams,
  identOf,
  itemsFor,
  rowOf,
  selectionOf,
  type OstiFetchOptions,
} from "./parse.js";

const PAGE = 200; // rows per request; 1000 is accepted, 200 keeps each response small

/** Page through the API until the total (or the limit) is reached. */
async function search(ctx: FetchContext, params: Record<string, string>): Promise<OstiRecord[]> {
  const file = path.join(ctx.dest, manifest.fetch!.catalogueFile);
  if (ctx.listFile) return JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as OstiRecord[];
  const records: OstiRecord[] = [];
  let page = 0;
  for (;;) {
    page++;
    const want = ctx.limit ? Math.min(PAGE, ctx.limit - records.length) : PAGE;
    const got = await fetchRecords(
      ctx.http,
      { ...params, rows: String(want), page: String(page) },
      ctx.signal,
    );
    records.push(...got);
    ctx.log.info(`  ${records.length} record(s)`);
    if (!got.length || got.length < want || (ctx.limit && records.length >= ctx.limit)) break;
    await ctx.sleep(Math.min(ctx.delay, 2));
  }
  const selected = ctx.limit ? records.slice(0, ctx.limit) : records;
  fs.writeFileSync(file, JSON.stringify(selected), "utf-8");
  return selected;
}

export const records: FetchSystem<OstiFetchOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const params = buildParams(opts);
    if (!selectionOf(params))
      throw new Error(
        "narrow the selection: --query, --identifier, --osti-id, --doi, --author, --title, --subject, --research-org, --sponsor-org, --fulltext-search, or a --from/--until window",
      );
    const found = await search(ctx, params);
    const rows = found.map(rowOf);
    writeTsv(path.join(ctx.dest, "_records.tsv"), rows, RECORD_COLUMNS);
    const items = itemsFor(found);
    const without = found.length - items.length;
    return {
      items,
      records: rows.map((r) => ({ ...r, ident: identOf(r) })),
      summary: [
        `${found.length} records, ${items.length} with full text${without ? `, ${without} citation-only` : ""}`,
      ],
      warnings: found.length ? [] : ["no records matched"],
    };
  },
};

export const query: QueryService<Record<string, never>> = {
  normalize: (raw) => raw.trim() || null,
  async lookup(keys, ctx) {
    const key = keys[0];
    const got = await fetchRecords(
      ctx.http,
      { identifier: ostiIdentifier(key), rows: "5" },
      ctx.signal,
    );
    const matches = got.map((r) => ({
      report_number: r.report_number ?? null,
      title: r.title ?? null,
      date: r.publication_date ?? null,
      authors: r.authors ?? null,
      osti_id: r.osti_id ?? null,
      doi: r.doi ?? null,
      url: `https://www.osti.gov/biblio/${String(r.osti_id ?? "")}`,
    }));
    const out: Record<string, QueryAnswer> = {};
    out[key] = matches.length ? { ...matches[0], matches } : null;
    return out;
  },
  describe: (r) => {
    const n = (r.matches as unknown[]).length;
    return `${String(r.title ?? "").slice(0, 70)}${n > 1 ? `  (+${n - 1})` : ""}`;
  },
};

export const plugin: BulkPlugin = {
  manifest,
  fetch: records as FetchSystem<never>,
  query: query as QueryService<never>,
};
