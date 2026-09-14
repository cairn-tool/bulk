import { textOf, unescapeHtml } from "../../text/html.js";

export const SITE = "https://research.fs.usda.gov";
export const SEARCH = `${SITE}/treesearch`;
export const SITEMAP = `${SITE}/sitemap.xml`;
export const itemUrl = (id: string): string => `${SITE}/treesearch/${id}`;

export interface TreesearchRecord {
  id: string;
  title: string;
  authors: string;
  year: string;
  type: string;
  station: string;
  source: string;
  pdf: string;
  size_text: string;
  keywords: string;
  url: string;
}

export const RECORD_COLUMNS = [
  "id",
  "title",
  "authors",
  "year",
  "type",
  "station",
  "source",
  "pdf",
  "size_text",
  "keywords",
] as const;

/** The ids on one search page, in result order, and the total the page prints. */
export function searchPage(html: string): { ids: string[]; total: number } {
  const m = /([\d,]+)\s+Publications/.exec(textOf(html));
  const total = m ? Number(m[1].replace(/,/g, "")) : 0;
  const ids: string[] = [];
  for (const x of html.matchAll(/href="\/treesearch\/(\d+)"/g))
    if (!ids.includes(x[1])) ids.push(x[1]);
  return { ids, total };
}

export function sitemapPages(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*sitemap\.xml\?page=\d+)<\/loc>/g)].map((m) =>
    unescapeHtml(m[1]),
  );
}

export function sitemapIds(xml: string): string[] {
  return [...xml.matchAll(/<loc>https:\/\/research\.fs\.usda\.gov\/treesearch\/(\d+)<\/loc>/g)].map(
    (m) => m[1],
  );
}

const FIELD = /--label">([^<]+):<\/td>\s*<td[^>]*--item">([\s\S]*?)<\/td>/g;

/** The publication page → its fields. */
export function recordOf(id: string, body: string): TreesearchRecord {
  const fields: Record<string, string> = {};
  for (const m of body.matchAll(FIELD))
    fields[unescapeHtml(m[1]).trim().toLowerCase()] = unescapeHtml(textOf(m[2]));
  const meta: Record<string, string[]> = {};
  for (const m of body.matchAll(/<meta[^>]*name="(citation_[^"]+)"[^>]*content="([^"]*)"/g))
    (meta[m[1]] ??= []).push(unescapeHtml(m[2]));
  const titleTag = /<title>([\s\S]*?)<\/title>/.exec(body);
  const title = meta.citation_title?.[0] || unescapeHtml(textOf(titleTag?.[1])).split(" | ")[0];
  let pdf = meta.citation_pdf_url?.[0] ?? "";
  if (!pdf)
    pdf =
      /href="(https:\/\/research\.fs\.usda\.gov\/download\/treesearch\/\d+\.pdf)"/.exec(
        body,
      )?.[1] ?? "";
  const size = /Download \(PDF ([^)]+)\)/.exec(body);
  const keywords =
    /<h2[^>]*>Keywords<\/h2>([\s\S]*?)(?:<h2|<\/div>\s*<div class="fsrd-article)/i.exec(body);
  return {
    id,
    title,
    authors: fields.authors ?? (meta.citation_author ?? []).join("; "),
    year: fields.year ?? (meta.citation_publication_date?.[0] ?? "").slice(0, 4),
    type: fields.type ?? "",
    station: fields.station ?? "",
    source: fields.source ?? meta.citation_journal_title?.[0] ?? "",
    pdf,
    size_text: size?.[1] ?? "",
    keywords: keywords ? textOf(keywords[1]).slice(0, 300) : "",
    url: itemUrl(id),
  };
}

export interface Narrowing {
  station?: string;
  type?: string;
  from?: string;
  until?: string;
}

export function keep(r: TreesearchRecord, opts: Narrowing): boolean {
  if (opts.station && !r.station.toLowerCase().includes(opts.station.toLowerCase())) return false;
  if (opts.type && !r.type.toLowerCase().includes(opts.type.toLowerCase())) return false;
  if (opts.from && r.year < String(opts.from)) return false;
  if (opts.until && r.year > String(opts.until)) return false;
  return true;
}
