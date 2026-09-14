import type { HttpClient } from "../http/types.js";

export const CROSSREF_API = "https://api.crossref.org/works";

interface DateParts {
  "date-parts"?: number[][];
}

export interface CrossrefWork {
  DOI?: string;
  type?: string;
  title?: string[];
  subtitle?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  "container-title"?: string[];
  publisher?: string;
  issued?: DateParts;
  "published-print"?: DateParts;
  "published-online"?: DateParts;
  created?: DateParts;
  volume?: string;
  issue?: string;
  page?: string;
  ISSN?: string[];
  ISBN?: string[];
  license?: { URL?: string }[];
  "reference-count"?: number;
  "is-referenced-by-count"?: number;
  URL?: string;
  link?: { URL?: string; "content-type"?: string; "content-version"?: string }[];
  institution?: { name?: string }[];
  abstract?: string;
}

export const first = (v: string[] | undefined): string => (v && v.length ? v[0] : "");

export function authorsOf(work: CrossrefWork): string[] {
  const out: string[] = [];
  for (const a of work.author ?? []) {
    const name = [a.given, a.family].filter(Boolean).join(" ") || a.name || "";
    if (name) out.push(name);
  }
  return out;
}

/** The first of issued / published-print / published-online / created as YYYY[-MM[-DD]]. */
export function issuedOf(work: CrossrefWork): string {
  for (const key of ["issued", "published-print", "published-online", "created"] as const) {
    const parts = work[key]?.["date-parts"]?.[0];
    if (parts && parts[0])
      return parts.map((p, i) => (i ? String(p).padStart(2, "0") : String(p))).join("-");
  }
  return "";
}

export function workRecord(m: CrossrefWork): Record<string, unknown> {
  return {
    doi: m.DOI ?? "",
    type: m.type ?? "",
    title: first(m.title),
    subtitle: first(m.subtitle),
    authors: authorsOf(m),
    container: first(m["container-title"]),
    publisher: m.publisher ?? "",
    issued: issuedOf(m),
    volume: m.volume ?? "",
    issue: m.issue ?? "",
    page: m.page ?? "",
    issn: (m.ISSN ?? []).join("; "),
    isbn: (m.ISBN ?? []).join("; "),
    licence: [
      ...new Set((m.license ?? []).map((l) => l.URL).filter((u): u is string => Boolean(u))),
    ]
      .sort()
      .join("; "),
    references: m["reference-count"] ?? "",
    cited_by: m["is-referenced-by-count"] ?? "",
    url: m.URL ?? "",
    links: (m.link ?? [])
      .filter((l) => l.URL)
      .map((l) => ({
        url: l.URL ?? "",
        type: l["content-type"] ?? "",
        version: l["content-version"] ?? "",
      })),
  };
}

/** `works/{doi}`: the work, null on 404. */
export async function fetchWork(
  http: HttpClient,
  doi: string,
  signal?: AbortSignal,
): Promise<CrossrefWork | null> {
  const response = await http.request({
    url: `${CROSSREF_API}/${encodeURIComponent(doi).replace(/%2F/g, "/")}`,
    accept: "application/json",
    userAgent: "polite",
    timeoutMs: 60_000,
    signal,
  });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error(`http ${response.status}`);
  return (await response.json<{ message: CrossrefWork }>()).message;
}

/** `works?query.bibliographic=`: the best matches for citation text. */
export async function searchWorks(
  http: HttpClient,
  text: string,
  rows: number,
  signal?: AbortSignal,
): Promise<{ items: CrossrefWork[]; total: number }> {
  const params = new URLSearchParams({ "query.bibliographic": text, rows: String(rows) });
  const response = await http.request({
    url: `${CROSSREF_API}?${params}`,
    accept: "application/json",
    userAgent: "polite",
    timeoutMs: 60_000,
    signal,
  });
  if (response.status !== 200) throw new Error(`http ${response.status}`);
  const message = (
    await response.json<{ message: { items?: CrossrefWork[]; "total-results"?: number } }>()
  ).message;
  return { items: message.items ?? [], total: message["total-results"] ?? 0 };
}
