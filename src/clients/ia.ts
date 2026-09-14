import type { HttpClient } from "../http/types.js";

/**
 * Internet Archive client: item search, item metadata and files, and the
 * Wayback Machine. Endpoints (all anonymous; archive.org/robots.txt disallows
 * only /control/ and /report/):
 *
 *   search    services/search/v1/scrape?q=&fields=&count=&cursor=   count >= 100, cursor-paged
 *             advancedsearch.php?q=&fl[]=&rows=&page=&output=json   small sets, sortable
 *   metadata  archive.org/metadata/<identifier>                     item metadata + every file with md5 and sha1
 *   download  archive.org/download/<identifier>/<file>
 *   wayback   web.archive.org/cdx/search/cdx?url=&output=json…      snapshot index
 *             web.archive.org/web/<timestamp>id_/<url>              the original bytes, unrewritten
 */

export const IA = "https://archive.org";
export const SCRAPE = `${IA}/services/search/v1/scrape`;
export const ADVANCED = `${IA}/advancedsearch.php`;
export const CDX = "https://web.archive.org/cdx/search/cdx";
export const WEB = "https://web.archive.org/web";

/** The scrape API rejects a smaller count. */
export const SCRAPE_MIN = 100;
export const DEFAULT_FIELDS = [
  "identifier",
  "title",
  "creator",
  "date",
  "year",
  "mediatype",
  "collection",
  "item_size",
  "downloads",
  "publicdate",
];

export type IaDoc = Record<string, unknown>;

export interface IaFile {
  name?: string;
  format?: string;
  size?: string | number;
  md5?: string;
  sha1?: string;
  source?: string;
}

export interface IaMetadata {
  metadata?: Record<string, unknown>;
  files?: IaFile[];
}

export interface ScrapePage {
  items: IaDoc[];
  cursor?: string;
  total?: number;
}

export async function scrape(
  http: HttpClient,
  query: string,
  opts: { fields?: string[]; count?: number; cursor?: string; signal?: AbortSignal } = {},
): Promise<ScrapePage> {
  const params = new URLSearchParams({
    q: query,
    fields: (opts.fields ?? DEFAULT_FIELDS).join(","),
    count: String(Math.max(opts.count ?? SCRAPE_MIN, SCRAPE_MIN)),
  });
  if (opts.cursor) params.set("cursor", opts.cursor);
  const response = await http.request({
    url: `${SCRAPE}?${params}`,
    accept: "application/json",
    timeoutMs: 120_000,
    signal: opts.signal,
  });
  const text = await response.text();
  if (response.status !== 200)
    throw new Error(`scrape: HTTP ${response.status} ${text.slice(0, 160)}`);
  const d = JSON.parse(text) as {
    items?: IaDoc[];
    cursor?: string;
    total?: number;
    error?: string;
  };
  if (d.error) throw new Error(`scrape: ${d.error}`);
  return { items: d.items ?? [], cursor: d.cursor, total: d.total };
}

/** Every item matching the query, cursor-paged. `limit` 0 takes all of them. */
export async function search(
  http: HttpClient,
  query: string,
  opts: {
    fields?: string[];
    limit?: number;
    delay?: number;
    sleep?: (s: number) => Promise<void>;
    log?: (m: string) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ items: IaDoc[]; total: number }> {
  const items: IaDoc[] = [];
  let cursor: string | undefined;
  let total: number | undefined;
  const limit = opts.limit ?? 0;
  for (;;) {
    const page = await scrape(http, query, {
      fields: opts.fields,
      count: limit ? Math.max(limit - items.length, SCRAPE_MIN) : SCRAPE_MIN,
      cursor,
      signal: opts.signal,
    });
    total ??= page.total;
    items.push(...page.items);
    opts.log?.(`  ${items.length} of ${total ?? "?"} items`);
    if (limit && items.length >= limit)
      return { items: items.slice(0, limit), total: total ?? items.length };
    cursor = page.cursor;
    if (!cursor || !page.items.length) return { items, total: total ?? items.length };
    if (opts.delay && opts.sleep) await opts.sleep(opts.delay);
  }
}

/** advancedsearch.php — small, sortable result sets. */
export async function advanced(
  http: HttpClient,
  query: string,
  opts: {
    fields?: string[];
    rows?: number;
    page?: number;
    sort?: string;
    signal?: AbortSignal;
  } = {},
): Promise<{ docs: IaDoc[]; numFound: number }> {
  const params = new URLSearchParams([
    ["q", query],
    ["rows", String(opts.rows ?? 50)],
    ["page", String(opts.page ?? 1)],
    ["output", "json"],
  ]);
  for (const f of opts.fields ?? DEFAULT_FIELDS) params.append("fl[]", f);
  if (opts.sort) params.append("sort[]", opts.sort);
  const response = await http.request({
    url: `${ADVANCED}?${params}`,
    accept: "application/json",
    timeoutMs: 120_000,
    signal: opts.signal,
  });
  if (response.status !== 200) throw new Error(`advancedsearch: HTTP ${response.status}`);
  const r =
    (await response.json<{ response?: { docs?: IaDoc[]; numFound?: number } }>()).response ?? {};
  return { docs: r.docs ?? [], numFound: r.numFound ?? 0 };
}

/** The whole metadata document for an item, or null when it does not exist (IA answers 200 with `{}`). */
export async function metadata(
  http: HttpClient,
  identifier: string,
  signal?: AbortSignal,
): Promise<IaMetadata | null> {
  const response = await http.request({
    url: `${IA}/metadata/${encodeURIComponent(identifier)}`,
    accept: "application/json",
    timeoutMs: 120_000,
    signal,
  });
  if (response.status !== 200) throw new Error(`metadata ${identifier}: HTTP ${response.status}`);
  const text = (await response.text()).trim();
  const d = text ? (JSON.parse(text) as IaMetadata) : {};
  return d.metadata ? d : null;
}

export function first(v: unknown): string {
  if (Array.isArray(v)) return v.length ? String(v[0]) : "";
  return v === undefined || v === null ? "" : String(v);
}

const joined = (v: unknown): string => (Array.isArray(v) ? v.map(String).join("; ") : first(v));

/** The fields worth a table row or a manifest column, from a metadata document. */
export function itemRecord(meta: IaMetadata): Record<string, unknown> {
  const m = meta.metadata ?? {};
  const files = meta.files ?? [];
  return {
    identifier: first(m.identifier),
    title: first(m.title),
    creator: joined(m.creator),
    date: first(m.date) || first(m.year),
    mediatype: first(m.mediatype),
    collection: joined(m.collection),
    publisher: first(m.publisher),
    language: first(m.language),
    licenseurl: first(m.licenseurl),
    files: files.length,
    bytes: files.reduce((n, f) => n + (Number(f.size ?? 0) || 0), 0),
    url: `${IA}/details/${first(m.identifier)}`,
  };
}

/** IA's own derivative and metadata formats, skipped by default. */
export const METADATA_FORMATS = new Set([
  "Metadata",
  "Archive BitTorrent",
  "Item Tile",
  "JSON",
  "Log",
  "OCR Page Index",
  "OCR Search Text",
  "chOCR",
  "hOCR",
  "Item CDX Index",
  "Item CDX Meta-Index",
  "Single Page Processed JP2 ZIP",
  "Animated GIF",
  "Thumbnail",
  "Spectrogram",
  "Essentia High GZ",
  "Essentia Low GZ",
  "Cue",
  "Metadata Log",
]);

export interface FileFilter {
  formats?: Set<string>;
  suffixes?: string[];
  originalsOnly?: boolean;
  skipDerivatives?: boolean;
}

export interface FileRow {
  name: string;
  format: string;
  size: number;
  md5: string;
  sha1: string;
  source: string;
  url: string;
}

/** The item's files, filtered. */
export function filesOf(meta: IaMetadata, filter: FileFilter = {}): FileRow[] {
  const ident = first(meta.metadata?.identifier);
  const skip = filter.skipDerivatives ?? true;
  const out: FileRow[] = [];
  for (const f of meta.files ?? []) {
    const name = f.name ?? "";
    const format = f.format ?? "";
    if (filter.originalsOnly && f.source !== "original") continue;
    if (skip && !filter.formats && !filter.suffixes && METADATA_FORMATS.has(format)) continue;
    if (filter.formats && !filter.formats.has(format)) continue;
    if (
      filter.suffixes &&
      !filter.suffixes.some((s) => name.toLowerCase().endsWith(s.toLowerCase()))
    )
      continue;
    out.push({
      name,
      format,
      size: Number(f.size ?? 0) || 0,
      md5: f.md5 ?? "",
      sha1: f.sha1 ?? "",
      source: f.source ?? "",
      url: `${IA}/download/${encodeURIComponent(ident)}/${name.split("/").map(encodeURIComponent).join("/")}`,
    });
  }
  return out;
}

export const CDX_FIELDS = [
  "urlkey",
  "timestamp",
  "original",
  "mimetype",
  "statuscode",
  "digest",
  "length",
] as const;
export type CdxRow = Record<(typeof CDX_FIELDS)[number], string>;

export interface CdxOptions {
  match?: "exact" | "prefix" | "host" | "domain";
  mimetype?: string;
  statuscode?: string;
  limit?: number;
  collapse?: string;
  since?: string;
  until?: string;
  signal?: AbortSignal;
  sleep?: (s: number) => Promise<void>;
}

/** Wayback CDX rows for a URL or pattern. */
export async function cdx(http: HttpClient, url: string, opts: CdxOptions = {}): Promise<CdxRow[]> {
  // CDX infers the match type from a trailing `*`; sending matchType as well makes it
  // treat the `*` literally and match nothing, so the two forms are reconciled here.
  let target = url;
  if (opts.match && target.endsWith("*")) target = target.slice(0, -1);
  const params = new URLSearchParams([
    ["url", target],
    ["output", "json"],
  ]);
  if (opts.match) params.append("matchType", opts.match);
  if (opts.mimetype) params.append("filter", `mimetype:${opts.mimetype}`);
  if (opts.statuscode ?? "200") params.append("filter", `statuscode:${opts.statuscode ?? "200"}`);
  params.append("collapse", opts.collapse ?? "digest");
  if (opts.since) params.append("from", opts.since.replace(/-/g, ""));
  if (opts.until) params.append("to", opts.until.replace(/-/g, ""));
  if (opts.limit) params.append("limit", String(opts.limit));
  let text: string;
  for (let attempt = 1; ; attempt++) {
    // CDX answers 503 under load; it is transient.
    const response = await http.request({
      url: `${CDX}?${params}`,
      timeoutMs: 180_000,
      signal: opts.signal,
      retries: 0,
    });
    const body = await response.text();
    if (response.status === 200) {
      text = body.trim();
      break;
    }
    if ((response.status !== 429 && response.status !== 503) || attempt === 3)
      throw new Error(`cdx: HTTP ${response.status}`);
    await (opts.sleep ?? ((s) => new Promise((r) => setTimeout(r, s * 1000))))(5 * attempt);
  }
  if (!text) return [];
  const rows = JSON.parse(text) as string[][];
  if (!rows.length) return [];
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])) as CdxRow);
}

/** The Wayback URL for a snapshot; `id_` gives the original bytes unrewritten. */
export function snapshotUrl(timestamp: string, original: string, raw = true): string {
  return `${WEB}/${timestamp}${raw ? "id_" : ""}/${original}`;
}
