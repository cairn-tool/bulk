import type { HttpClient } from "../http/types.js";

export const OSTI_API = "https://www.osti.gov/api/v1/records";

export interface OstiRecord {
  osti_id?: string | number;
  report_number?: string;
  title?: string;
  authors?: string[] | string;
  product_type?: string;
  publication_date?: string;
  doi?: string;
  research_orgs?: string[] | string;
  sponsor_orgs?: string[] | string;
  subjects?: string[] | string;
  links?: { rel?: string; href?: string }[];
  identifier?: string;
  country_publication?: string;
  format?: string;
}

export function fulltextOf(record: OstiRecord): string {
  return record.links?.find((l) => l.rel === "fulltext" && l.href)?.href ?? "";
}

export function citationOf(record: OstiRecord): string {
  return record.links?.find((l) => l.rel === "citation" && l.href)?.href ?? "";
}

/** One page of `records?…`: the API answers a bare JSON array. */
export async function fetchRecords(
  http: HttpClient,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<OstiRecord[]> {
  const response = await http.request({
    url: `${OSTI_API}?${new URLSearchParams(params)}`,
    accept: "application/json",
    userAgent: "polite",
    timeoutMs: 180_000,
    signal,
  });
  if (response.status !== 200) throw new Error(`OSTI API: HTTP ${response.status}`);
  const got = await response.json<unknown>();
  if (!Array.isArray(got))
    throw new Error(`OSTI API: unexpected response ${JSON.stringify(got).slice(0, 120)}`);
  return got as OstiRecord[];
}

/** NTIS spells report numbers without punctuation; OSTI's `identifier` search tolerates that, and the volume/revision forms are rewritten to OSTI's. */
export function ostiIdentifier(designation: string): string {
  return designation
    .replace(/\.pdf$/i, "")
    .replace(/REV(\d*)$/, "-REV.$1")
    .replace(/-V(\d)$/, "-VOL.$1");
}
