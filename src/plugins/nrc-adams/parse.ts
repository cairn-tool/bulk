import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";

export const API = "https://adams-search.nrc.gov/api/search";
export const PAGE = 1000;

export interface AdamsFilter {
  field: string;
  value: string;
  operator?: string;
}

export interface AdamsDoc {
  AccessionNumber?: string;
  Url?: string;
  IsPackage?: string;
  DocumentTitle?: string;
  Name?: string;
  DocumentDate?: string;
  DateAdded?: string;
  DocumentType?: string[];
  DocketNumber?: string[];
  AuthorName?: string[];
  AuthorAffiliation?: string[];
  DocumentSize?: number | string;
  EstimatedPageCount?: number | string;
  PackagesFiledIn?: string[];
}

/** The search body. `q` must be "" (not "*"): a "*" query makes every text filter match nothing. */
export function searchBody(q: string, filters: AdamsFilter[], skip: number): string {
  return JSON.stringify({
    q: q || "",
    filters,
    anyFilters: [],
    legacyLibFilter: true,
    mainLibFilter: true,
    content: false,
    size: PAGE,
    skip,
  });
}

export const dateFilter = (field: string, a: string, b: string): AdamsFilter => ({
  field,
  value: `(${field} ge '${a}' and ${field} le '${b}')`,
});
export const equals = (field: string, value: string): AdamsFilter => ({
  field,
  value,
  operator: "equals",
});

const join = (v: string[] | undefined): string => (v ?? []).join("; ");

export function itemsFor(docs: readonly AdamsDoc[]): Item[] {
  const items: Item[] = [];
  for (const d of docs) {
    const acc = d.AccessionNumber ?? "";
    const url = d.Url ?? "";
    if (!acc || !url || d.IsPackage === "Yes") continue;
    const title = cleanTitle(d.DocumentTitle || d.Name || "");
    const clean = url.split("?")[0];
    const dot = clean.lastIndexOf(".");
    const ext = (dot > clean.lastIndexOf("/") ? clean.slice(dot).toLowerCase() : "") || ".pdf";
    const year = (d.DateAdded ?? "").slice(0, 4) || "undated";
    items.push({
      dest: `${year}/${safeName(`${acc} - ${title}`)}${ext}`,
      url,
      // DocumentSize is not the served file's exact size; verify by magic only.
      bytes: 0,
      request: { userAgent: "curl" },
      extra: {
        accession: acc,
        title,
        document_date: d.DocumentDate ?? "",
        date_added: d.DateAdded ?? "",
        type: join(d.DocumentType),
        docket: join(d.DocketNumber),
        author: join(d.AuthorName),
        affiliation: join(d.AuthorAffiliation),
        listed_bytes: d.DocumentSize ?? null,
        pages: d.EstimatedPageCount ?? null,
        is_package: d.IsPackage ?? "",
        package: join(d.PackagesFiledIn),
        list_id: acc,
      },
    });
  }
  dedupeDests(items);
  return items;
}
