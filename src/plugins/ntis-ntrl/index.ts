import fs from "node:fs";
import path from "node:path";
import {
  NTRL,
  NtrlSession,
  detail,
  type DetailRecord,
  type SearchRow,
} from "../../clients/ntrl.js";
import { fetchRecords } from "../../clients/osti.js";
import type {
  BulkPlugin,
  FetchContext,
  FetchPlan,
  FetchSystem,
  Item,
  ItemRequest,
  ListColumn,
  QueryAnswer,
  QueryService,
} from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { Progress } from "../../pull/progress.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  RECORD_COLUMNS,
  dticUrl,
  flattenDetail,
  flattenHarvest,
  isDtic,
  normalizeAccession,
  type HarvestRecord,
} from "./parse.js";

export interface NtisFetchOptions {
  query?: string;
  accession?: string[];
  source?: "agency" | "ntrl" | "both";
  recordsOnly?: boolean;
}

const SESSION_JAR = "session:ntrl";

/** OSTI's identifier search, which tolerates NTIS's de-punctuated report numbers. */
async function ostiFulltext(
  ctx: FetchContext,
  accession: string,
): Promise<{ url: string; note: string }> {
  try {
    const records = await fetchRecords(ctx.http, { identifier: accession, rows: "2" }, ctx.signal);
    for (const r of records) {
      const link = r.links?.find((l) => l.rel === "fulltext" && l.href);
      if (link?.href)
        return { url: link.href, note: `OSTI ${String(r.osti_id)} (${r.report_number || "—"})` };
    }
  } catch {
    // one failed lookup must not end the run
  }
  return { url: "", note: "" };
}

/** The request that replays NTRL's own download command link — part of the JSF view the detail page opened. */
function ntrlDownload(rec: DetailRecord): { url: string; request: ItemRequest } | undefined {
  const link = rec.downloads.find((d) => d.label === "Download PDF");
  if (!link || !rec.action) return undefined;
  return {
    url: NTRL + rec.action,
    request: {
      method: "POST",
      body: new URLSearchParams({
        detailsTBarForm: "detailsTBarForm",
        [link.id]: link.id,
        "javax.faces.ViewState": rec.viewstate,
      }),
      headers: { referer: rec.url },
      cookieJar: SESSION_JAR,
    },
  };
}

async function resolveDocument(
  ctx: FetchContext,
  rec: DetailRecord,
  flat: HarvestRecord,
  order: ("ntrl" | "agency")[],
): Promise<ItemRequest | undefined> {
  for (const where of order) {
    if (where === "ntrl") {
      const dl = ntrlDownload(rec);
      if (dl) {
        flat.source = "NTRL";
        flat.source_url = dl.url;
        return dl.request;
      }
    } else if (isDtic(flat.accession)) {
      flat.source = "DTIC";
      flat.source_url = dticUrl(flat.accession);
      return undefined;
    } else {
      const { url, note } = await ostiFulltext(ctx, flat.accession);
      if (url) {
        flat.source = note;
        flat.source_url = url;
        return undefined;
      }
    }
  }
  return undefined;
}

export const reports: FetchSystem<NtisFetchOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!(opts.query || opts.accession?.length))
      throw new Error("select records with --query or --accession");
    const order: ("ntrl" | "agency")[] = {
      agency: ["agency"],
      ntrl: ["ntrl"],
      both: ["ntrl", "agency"],
    }[opts.source ?? "agency"] as ("ntrl" | "agency")[];
    const jar = ctx.jar(SESSION_JAR);
    let rows: SearchRow[] = (opts.accession ?? []).map((a) => ({
      accession: a,
      title: "",
      authors: "",
      year: "",
      pages: "",
    }));
    if (ctx.listFile) rows = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as SearchRow[];
    else if (opts.query) {
      const session = new NtrlSession(ctx.http, jar, ctx.signal);
      const { rows: found } = await session.walk(opts.query, ctx.limit, {
        delay: ctx.delay,
        sleep: ctx.sleep,
        log: (m) => ctx.log.info(m),
      });
      const have = new Set(rows.map((r) => r.accession));
      rows.push(...found.filter((r) => !have.has(r.accession)));
    }
    if (ctx.limit) rows = rows.slice(0, ctx.limit);
    fs.writeFileSync(
      path.join(ctx.dest, manifest.fetch!.catalogueFile),
      JSON.stringify(rows),
      "utf-8",
    );
    if (!rows.length) return { items: [], summary: [], warnings: ["no records matched"] };

    const progress = new Progress(rows.length, ctx.stream);
    const records: HarvestRecord[] = [];
    const requests = new Map<string, ItemRequest>();
    for (let i = 0; i < rows.length; i++) {
      if (ctx.signal.aborted) break;
      const row = rows[i];
      progress.start(i + 1, row.accession);
      let rec: DetailRecord;
      try {
        rec = await detail(ctx.http, row.accession, jar, ctx.signal);
      } catch (error) {
        progress.finish(`FAIL ${(error as Error).message}`);
        continue;
      }
      const flat = flattenHarvest(rec, row);
      if (!opts.recordsOnly) {
        const request = await resolveDocument(ctx, rec, flat, order);
        if (request) requests.set(flat.accession, request);
      }
      progress.finish(
        flat.source
          ? `${flat.year.padEnd(5)} via ${flat.source.slice(0, 34)}`
          : `${flat.year.padEnd(5)} ${opts.recordsOnly ? flat.title.slice(0, 44) : "no source"}`,
      );
      records.push(flat);
      if (i < rows.length - 1 && ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
    }
    writeTsv(
      path.join(ctx.dest, "_records.tsv"),
      records as unknown as Record<string, unknown>[],
      RECORD_COLUMNS,
    );
    fs.writeFileSync(path.join(ctx.dest, "_records.json"), JSON.stringify(records), "utf-8");

    const items: Item[] = [];
    for (const r of records) {
      if (!r.source_url) continue;
      const category = (r.categories || "").split(";")[0].trim() || "Uncategorised";
      const folder = safeName(cleanTitle(category), 60);
      const name = safeName(`${r.accession} - ${cleanTitle(r.title)}`);
      items.push({
        dest: `${folder}/${name}.pdf`,
        url: r.source_url,
        request: requests.get(r.accession),
        extra: { ...r, list_id: r.accession },
      });
    }
    dedupeDests(items);
    const missing = records.filter((r) => !r.source_url);
    const summary = [`${records.length} record(s), ${items.length} with a document`];
    const warnings: string[] = [];
    if (missing.length && !opts.recordsOnly)
      warnings.push(
        `${missing.length} without a source: ${missing
          .slice(0, 12)
          .map((r) => r.accession)
          .join(
            ", ",
          )}${missing.length > 12 ? " …" : ""} — try \`bulk ntrs query --search "<title>"\` or \`bulk archive-wayback fetch\` for those`,
      );
    return {
      items: opts.recordsOnly ? [] : items,
      records: records as unknown as Record<string, unknown>[],
      summary,
      warnings,
    };
  },
};

export interface NtisQueryOptions {
  search?: boolean;
  rows?: number;
  abstract?: boolean;
}

const SEARCH_COLUMNS: readonly ListColumn[] = [
  { key: "query", width: 40 },
  { key: "total", align: "right", width: 8 },
  { key: "shown", align: "right", width: 5 },
];

export const query: QueryService<NtisQueryOptions> = {
  normalize: (raw, opts) => (opts.search ? raw.trim() || null : normalizeAccession(raw)),
  async lookup(keys, ctx, opts) {
    const key = keys[0];
    const out: Record<string, QueryAnswer> = {};
    if (opts.search) {
      const session = new NtrlSession(ctx.http, ctx.jar(SESSION_JAR), ctx.signal);
      const { rows, total } = await session.walk(key, opts.rows ?? 10, {
        delay: ctx.delay,
        sleep: ctx.sleep,
      });
      out[key] = rows.length ? { query: key, total, shown: rows.length, hits: rows } : null;
      return out;
    }
    const rec = await detail(ctx.http, key, undefined, ctx.signal);
    out[key] = rec.title ? flattenDetail(rec) : null;
    return out;
  },
  describe: (r) =>
    "hits" in r
      ? `${Number(r.total)} match(es)`
      : `${String(r.title ?? "").slice(0, 54)}  (${String(r.date ?? "").slice(0, 4)})`,
  columns: (opts) => (opts.search ? SEARCH_COLUMNS : manifest.query!.columns),
  details(_key, record, opts) {
    if (opts.search)
      return ((record.hits as SearchRow[]) ?? []).map(
        (r) =>
          `${r.accession.padEnd(16)} ${r.year.padEnd(6)} ${r.title.slice(0, 60)}${r.authors ? `\n  ${"".padEnd(16)} ${r.authors.slice(0, 60)}` : ""}`,
      );
    if (opts.abstract) {
      const lines: string[] = [];
      if (record.abstract) lines.push(String(record.abstract));
      if (record.keywords) lines.push(`keywords: ${String(record.keywords)}`);
      return lines;
    }
    return undefined;
  },
};

export const plugin: BulkPlugin = {
  manifest,
  fetch: reports as FetchSystem<never>,
  query: query as QueryService<never>,
};
