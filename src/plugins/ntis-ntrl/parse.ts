import type { DetailRecord, SearchRow } from "../../clients/ntrl.js";

/** Accession numbers are alphanumeric; NTIS writes them without punctuation. */
export function normalizeAccession(raw: string): string | null {
  const s = (raw ?? "")
    .trim()
    .replace(/[\s./-]+/g, "")
    .toUpperCase();
  return /^[A-Z0-9]{4,}$/.test(s) ? s : null;
}

/** A title-detail record → the flat query record. */
export function flattenDetail(rec: DetailRecord): Record<string, unknown> {
  const f = rec.fields;
  return {
    accession: rec.accession,
    title: rec.title,
    authors: f["Personal Author"] ?? "",
    date: f["Publication Date"] ?? "",
    pages: f["Page Count"] ?? "",
    document_type: f["Document Type"] ?? "",
    agency: f["Source Agency"] ?? "",
    categories: f["NTIS Subject Category"] ?? "",
    corporate: f["Corporate Authors"] ?? "",
    keywords: f["Keywords"] ?? "",
    notes: f["Supplemental Notes"] ?? "",
    issue: f["NTIS Issue Number"] ?? "",
    abstract: f["Abstract"] ?? "",
    ntrl_offers: rec.downloads.map((d) => d.label).join("; ") || "—",
    url: rec.url,
  };
}

export interface HarvestRecord {
  accession: string;
  title: string;
  authors: string;
  year: string;
  pages: string;
  document_type: string;
  agency: string;
  categories: string;
  corporate: string;
  keywords: string;
  notes: string;
  issue: string;
  abstract: string;
  ntrl_offers: string;
  url: string;
  source: string;
  source_url: string;
}

export const RECORD_COLUMNS = [
  "accession",
  "title",
  "authors",
  "year",
  "pages",
  "document_type",
  "agency",
  "categories",
  "corporate",
  "keywords",
  "ntrl_offers",
  "source",
  "source_url",
  "abstract",
] as const;

/** A title-detail record plus its search row → one flat harvest record. */
export function flattenHarvest(rec: DetailRecord, row: SearchRow): HarvestRecord {
  const f = rec.fields;
  return {
    accession: rec.accession,
    title: rec.title || row.title,
    authors: f["Personal Author"] || row.authors || "",
    year: f["Publication Date"] || row.year || "",
    pages: f["Page Count"] || row.pages.replace(/\D/g, ""),
    document_type: f["Document Type"] ?? "",
    agency: f["Source Agency"] ?? "",
    categories: f["NTIS Subject Category"] ?? "",
    corporate: f["Corporate Authors"] ?? "",
    keywords: f["Keywords"] ?? "",
    notes: f["Supplemental Notes"] ?? "",
    issue: f["NTIS Issue Number"] ?? "",
    abstract: (f["Abstract"] ?? "").slice(0, 2000),
    ntrl_offers: rec.downloads.map((d) => d.label).join("; "),
    url: rec.url,
    source: "",
    source_url: "",
  };
}

export const isDtic = (accession: string): boolean => /^AD[A-Z]?\d+$/i.test(accession);
export const dticUrl = (accession: string): string =>
  `https://apps.dtic.mil/sti/pdfs/${accession.toUpperCase()}.pdf`;
