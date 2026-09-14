import { citationOf, fulltextOf, type OstiRecord } from "../../clients/osti.js";
import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";

const join = (v: string[] | string | undefined): string =>
  Array.isArray(v) ? v.join("; ") : (v ?? "");

export const RECORD_COLUMNS = [
  "osti_id",
  "report_number",
  "title",
  "authors",
  "product_type",
  "publication_date",
  "doi",
  "research_orgs",
  "sponsor_orgs",
  "subjects",
  "has_fulltext",
  "citation",
] as const;

export function rowOf(r: OstiRecord): Record<string, string> {
  return {
    osti_id: String(r.osti_id ?? ""),
    report_number: r.report_number ?? "",
    title: (r.title ?? "").trim(),
    authors: join(r.authors),
    product_type: r.product_type ?? "",
    publication_date: (r.publication_date ?? "").slice(0, 10),
    doi: r.doi ?? "",
    research_orgs: join(r.research_orgs),
    sponsor_orgs: join(r.sponsor_orgs),
    subjects: join(r.subjects).slice(0, 300),
    has_fulltext: fulltextOf(r) ? "yes" : "no",
    citation: citationOf(r),
    identifier: r.identifier ?? "",
    country: r.country_publication ?? "",
    format: r.format ?? "",
  };
}

/** The report number a document is filed under, else the OSTI id. */
export function identOf(row: Record<string, string>): string {
  return (row.report_number ?? "").split(";")[0].trim() || `OSTI ${row.osti_id ?? ""}`;
}

export function itemsFor(records: readonly OstiRecord[]): Item[] {
  const items: Item[] = [];
  for (const r of records) {
    const url = fulltextOf(r);
    if (!url) continue;
    const row = rowOf(r);
    const folder = safeName(row.product_type || "Other", 60);
    const name = safeName(`${cleanTitle(identOf(row))} - ${cleanTitle(row.title)}`);
    items.push({ dest: `${folder}/${name}.pdf`, url, extra: { ...row, list_id: row.osti_id } });
  }
  dedupeDests(items);
  return items;
}

/** `1969`, `1969-03`, `1969-03-04` → the MM/DD/YYYY the API expects. */
export function mdY(value: string, end = false): string {
  const [y, m, d] = String(value).split("-");
  const mm = m ?? (end ? "12" : "01");
  const dd = d ?? (end ? "31" : "01");
  return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${y}`;
}

export interface OstiFetchOptions {
  query?: string;
  identifier?: string;
  ostiId?: string;
  doi?: string;
  author?: string;
  title?: string;
  subject?: string;
  researchOrg?: string;
  sponsorOrg?: string;
  fulltextSearch?: string;
  from?: string;
  until?: string;
  byEntryDate?: boolean;
  citationsOnlyToo?: boolean;
  sort?: string;
  order?: string;
}

/** The API query parameters from the command's options. */
export function buildParams(opts: OstiFetchOptions): Record<string, string> {
  const p: Record<string, string> = {};
  const map: [string, string | undefined][] = [
    ["q", opts.query],
    ["identifier", opts.identifier],
    ["osti_id", opts.ostiId],
    ["doi", opts.doi],
    ["author", opts.author],
    ["title", opts.title],
    ["subject", opts.subject],
    ["research_org", opts.researchOrg],
    ["sponsor_org", opts.sponsorOrg],
    ["fulltext", opts.fulltextSearch],
  ];
  for (const [key, value] of map) if (value) p[key] = value;
  if (opts.from)
    p[opts.byEntryDate ? "entry_date_start" : "publication_date_start"] = mdY(opts.from);
  if (opts.until)
    p[opts.byEntryDate ? "entry_date_end" : "publication_date_end"] = mdY(opts.until, true);
  if (!opts.citationsOnlyToo) p.has_fulltext = "true";
  if (opts.sort) {
    p.sort = opts.sort;
    p.order = opts.order ?? "desc";
  }
  return p;
}

export function selectionOf(params: Record<string, string>): boolean {
  return Object.keys(params).some((k) => !["has_fulltext", "sort", "order"].includes(k));
}
