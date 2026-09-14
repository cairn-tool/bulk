import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { parseXml, xmlArray, xmlText } from "../../text/xml.js";

export const API = "https://export.arxiv.org/api/query";
export const SITE = "https://arxiv.org";
export const PAGE = 100; // entries per API request; arXiv allows more, this is polite

export interface ArxivRecord {
  arxiv_id: string;
  version: string;
  title: string;
  authors: string;
  summary: string;
  primary_category: string;
  categories: string;
  published: string;
  updated: string;
  doi: string;
  journal_ref: string;
  comment: string;
  pdf: string;
  abs: string;
}

export const RECORD_COLUMNS = [
  "arxiv_id",
  "version",
  "title",
  "authors",
  "primary_category",
  "categories",
  "published",
  "updated",
  "doi",
  "journal_ref",
  "comment",
] as const;

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

/** An Atom feed → its entries and the OpenSearch total. */
export function parseFeed(xml: string): { entries: ArxivRecord[]; total: number | undefined } {
  const doc = parseXml(xml, { arrays: ["entry", "link", "author", "category"] });
  const feed = (doc.feed ?? {}) as Record<string, unknown>;
  const total = xmlText(feed.totalResults);
  const entries = xmlArray<Record<string, unknown>>(feed.entry).map((e) => {
    const rawId = xmlText(e.id).split("/abs/").pop() ?? "";
    const m = /^(.+?)v(\d+)$/.exec(rawId);
    const links: Record<string, string> = {};
    for (const l of xmlArray<Record<string, unknown>>(e.link)) {
      const title = String(l["@_title"] ?? "");
      if (title) links[title] = String(l["@_href"] ?? "");
      else if (l["@_rel"] === "alternate") links.abs = String(l["@_href"] ?? "");
    }
    const primary = e.primary_category as Record<string, unknown> | undefined;
    return {
      arxiv_id: m ? m[1] : rawId,
      version: m ? m[2] : "",
      title: squash(xmlText(e.title)),
      authors: xmlArray<Record<string, unknown>>(e.author)
        .map((a) => xmlText(a.name))
        .join("; "),
      summary: squash(xmlText(e.summary)),
      primary_category: String(primary?.["@_term"] ?? ""),
      categories: xmlArray<Record<string, unknown>>(e.category)
        .map((c) => String(c["@_term"] ?? ""))
        .join("; "),
      published: xmlText(e.published).slice(0, 10),
      updated: xmlText(e.updated).slice(0, 10),
      doi: xmlText(e.doi),
      journal_ref: xmlText(e.journal_ref),
      comment: squash(xmlText(e.comment)),
      pdf: links.pdf ?? "",
      abs: links.abs ?? "",
    };
  });
  return { entries, total: total ? Number(total) : undefined };
}

export interface QueryParts {
  query?: string;
  category?: string[];
  author?: string[];
  title?: string[];
}

/** The arXiv search_query string from --query / --category / --author / --title. */
export function buildQuery(opts: QueryParts): string {
  const parts: string[] = [];
  if (opts.query) parts.push(`(${opts.query})`);
  for (const c of opts.category ?? []) parts.push(`cat:${c}`);
  for (const a of opts.author ?? []) parts.push(`au:"${a}"`);
  for (const t of opts.title ?? []) parts.push(`ti:"${t}"`);
  return parts.join(" AND ");
}

export function itemsFor(
  records: readonly ArxivRecord[],
  wantPdf: boolean,
  wantSource: boolean,
): Item[] {
  const items: Item[] = [];
  for (const r of records) {
    const folder = r.primary_category || "unclassified";
    const vid = r.arxiv_id + (r.version ? `v${r.version}` : "");
    const stem = safeName(`${vid} - ${cleanTitle(r.title)}`);
    if (wantPdf)
      items.push({
        dest: `${folder}/${stem}.pdf`,
        url: r.pdf || `${SITE}/pdf/${vid}`,
        extra: { ...r, kind: "pdf", list_id: vid },
      });
    if (wantSource)
      items.push({
        dest: `${folder}/${stem}.tar.gz`,
        url: `${SITE}/e-print/${vid}`,
        magic: new Uint8Array([0x1f, 0x8b]),
        extra: { ...r, kind: "source", list_id: `${vid}-src` },
      });
  }
  dedupeDests(items);
  return items;
}
