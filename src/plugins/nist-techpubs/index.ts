import fs from "node:fs";
import path from "node:path";
import { fetchWork, authorsOf, first, issuedOf } from "../../clients/crossref.js";
import type {
  BulkPlugin,
  FetchContext,
  FetchPlan,
  FetchSystem,
  QueryAnswer,
  QueryService,
} from "../../plugin/types.js";
import { fetchVerified } from "../../pull/verify.js";
import { human } from "../../text/bytes.js";
import { loadJson, saveJson } from "../../text/json-file.js";
import { writeTsv } from "../../text/tsv.js";
import { xmlRecords } from "../../text/xml.js";
import { manifest } from "./manifest.js";
import {
  DOI_PREFIX,
  RECORD_COLUMNS,
  hasSelection,
  itemsFor,
  matches,
  normalizeDesignation,
  recordOf,
  seriesOf,
  type NistRecord,
  type NistSelection,
} from "./parse.js";

export const RELEASE = "https://api.github.com/repos/usnistgov/NIST-Tech-Pubs/releases/latest";
export const ASSET = "allrecords-MODS.xml";

interface Release {
  tag_name?: string;
  published_at?: string;
  assets?: { name?: string; size?: number; browser_download_url?: string }[];
}

/** The catalogue file, taken from the latest release if it is not already here. */
async function catalogue(ctx: FetchContext, refresh: boolean): Promise<string> {
  const folder = path.join(ctx.dest, "_catalogue");
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, ASSET);
  const stamp = path.join(folder, "release.json");
  if (fs.existsSync(file) && !refresh) {
    const tag = loadJson<{ tag?: string }>(stamp, {}).tag ?? "?";
    ctx.log.info(`catalogue: ${ASSET} (${human(fs.statSync(file).size)}, release ${tag})`);
    return file;
  }
  const response = await ctx.http.request({
    url: RELEASE,
    accept: "application/vnd.github+json",
    timeoutMs: 60_000,
    signal: ctx.signal,
  });
  if (response.status !== 200) throw new Error(`NIST-Tech-Pubs releases: HTTP ${response.status}`);
  const release = await response.json<Release>();
  const asset = release.assets?.find((a) => a.name === ASSET);
  if (!asset?.browser_download_url)
    throw new Error(`release ${release.tag_name ?? "?"} has no ${ASSET}`);
  ctx.log.info(
    `catalogue: release ${release.tag_name ?? "?"}, ${ASSET} ${human(asset.size ?? 0)} — taking it`,
  );
  const result = await fetchVerified(
    ctx.http,
    {
      dest: ASSET,
      url: asset.browser_download_url,
      bytes: asset.size,
      magic: new TextEncoder().encode("<?xml"),
      extra: {},
    },
    asset.browser_download_url,
    file,
    undefined,
    { signal: ctx.signal },
  );
  if (result.status !== "ok") throw new Error(`catalogue download failed: ${result.note}`);
  saveJson(
    stamp,
    {
      tag: release.tag_name,
      published: release.published_at ?? "",
      asset: ASSET,
      bytes: result.bytes,
    },
    2,
  );
  return file;
}

/** Streams the MODS collection, one record at a time, keeping the matches. */
async function select(
  file: string,
  opts: NistSelection,
  limit: number,
  log: (m: string) => void,
): Promise<NistRecord[]> {
  const kept: NistRecord[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  for await (const xml of xmlRecords(fs.createReadStream(file, { encoding: "utf-8" }), "mods")) {
    scanned++;
    const r = recordOf(xml);
    if (!r.designation || !r.url || seen.has(r.designation)) continue;
    if (!matches(r, opts)) continue;
    seen.add(r.designation);
    kept.push(r);
    if (limit && kept.length >= limit) break;
  }
  log(`  ${scanned} records scanned, ${kept.length} kept`);
  return kept;
}

export interface NistFetchOptions extends NistSelection {
  refreshCatalogue?: boolean;
}

export const techpubs: FetchSystem<NistFetchOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!hasSelection(opts))
      throw new Error(
        "narrow the selection: --id, --series, --query, --author, --subject, --doi, or a --from/--until year window",
      );
    const file = ctx.listFile ?? (await catalogue(ctx, Boolean(opts.refreshCatalogue)));
    const found = await select(file, opts, ctx.limit, (m) => ctx.log.info(m));
    writeTsv(
      path.join(ctx.dest, "_records.tsv"),
      found as unknown as Record<string, unknown>[],
      RECORD_COLUMNS,
    );
    fs.writeFileSync(path.join(ctx.dest, "_records.json"), JSON.stringify(found), "utf-8");
    const items = itemsFor(found);
    const bySeries = new Map<string, number>();
    for (const r of found) bySeries.set(r.series, (bySeries.get(r.series) ?? 0) + 1);
    const top = [...bySeries.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k} ${v}`);
    return {
      items,
      records: found as unknown as Record<string, unknown>[],
      summary: [`${items.length} publication(s) in ${bySeries.size} series: ${top.join(", ")}`],
      warnings: found.length ? [] : ["no publications matched"],
    };
  },
};

export interface NistQueryOptions {
  resolve?: boolean;
}

export const query: QueryService<NistQueryOptions> = {
  normalize: (raw) => normalizeDesignation(raw),
  async lookup(keys, ctx) {
    const key = keys[0];
    const doi = DOI_PREFIX + key;
    const m = await fetchWork(ctx.http, doi, ctx.signal);
    const out: Record<string, QueryAnswer> = {};
    out[key] = m
      ? {
          designation: key,
          series: seriesOf(key),
          doi: m.DOI ?? doi,
          title: first(m.title),
          subtitle: first(m.subtitle),
          authors: authorsOf(m),
          issued: issuedOf(m),
          type: m.type ?? "",
          publisher: m.publisher ?? "",
          institution: (m.institution ?? [])
            .map((i) => i.name ?? "")
            .filter(Boolean)
            .join("; "),
          abstract: (m.abstract ?? "")
            .replace(/<[^>]+>/g, " ")
            .slice(0, 400)
            .trim(),
          url: m.URL ?? `https://doi.org/${doi}`,
          pdf: "",
        }
      : null;
    return out;
  },
  describe: (r) => `${String(r.title ?? "").slice(0, 56)}  (${String(r.issued ?? "").slice(0, 4)})`,
  columns: (opts) =>
    opts.resolve ? [...manifest.query!.columns, { key: "pdf" }] : manifest.query!.columns,
  async enrich(results, ctx, opts) {
    if (!opts.resolve) return;
    for (const result of Object.values(results)) {
      if (!result || "error" in result) continue;
      try {
        result.pdf = await ctx.http.resolve(`https://doi.org/${String(result.doi)}`, {
          signal: ctx.signal,
        });
      } catch (error) {
        result.pdf = `(${(error as Error).message})`;
      }
    }
  },
};

export const plugin: BulkPlugin = {
  manifest,
  fetch: techpubs as FetchSystem<never>,
  query: query as QueryService<never>,
};
