import type { CookieJar } from "../http/cookie-jar.js";
import type { HttpClient } from "../http/types.js";
import { textOf, unescapeHtml } from "../text/html.js";

/**
 * A client for the National Technical Reports Library at ntrl.ntis.gov.
 *
 * NTRL is a JSF/PrimeFaces application — stateful, with a JSESSIONID and a
 * `javax.faces.ViewState` that both have to be carried — but only two shapes of
 * request are needed and both are plain:
 *
 *   GET  /NTRL/dashboard/searchResults.xhtml?searchQuery=…      page 1 of a search, server-rendered;
 *        every row carries its accession number in `data-rk`, the paginator prints the total
 *   POST the same URL, as a PrimeFaces DataTable pagination request   page 2 and after, 100 rows a page
 *   GET  /NTRL/dashboard/searchResults/titleDetail/<accession>.xhtml   one record, stateless
 *
 * What the download action returns is in docs/sources/ntis-ntrl/access.md.
 */

export const NTRL = "https://ntrl.ntis.gov";
export const SEARCH = `${NTRL}/NTRL/dashboard/searchResults.xhtml`;
export const detailUrl = (accession: string): string =>
  `${NTRL}/NTRL/dashboard/searchResults/titleDetail/${encodeURIComponent(accession)}.xhtml`;

export interface SearchRow {
  accession: string;
  title: string;
  authors: string;
  year: string;
  pages: string;
}

/** Every result row in a search page or a partial-response, in order. */
export function rowsOf(markup: string): SearchRow[] {
  const out: SearchRow[] = [];
  for (const block of markup.match(/<tr[^>]*data-ri="\d+"[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const rk = /data-rk="([^"]+)"/.exec(block);
    const title = /id="[^"]*itemTitleSR"[^>]*>([\s\S]*?)<\/span>/.exec(block);
    const authors = /id="[^"]*itempersonalAuthorsAsTextSR"[^>]*>([\s\S]*?)<\/span>/.exec(block);
    const details = [
      ...block.matchAll(/class="searchResultsSummaryDetails"[^>]*>([\s\S]*?)<\/span>/g),
    ].map((m) => textOf(m[1]));
    const accession = rk?.[1] ?? "";
    if (!accession) continue;
    out.push({
      accession,
      title: textOf(title?.[1]),
      authors: textOf(authors?.[1]),
      year: details[1] ?? "",
      pages: details[2] ?? "",
    });
  }
  return out;
}

export function totalOf(markup: string): number {
  const m = /\(\s*[\d,]+\s*-\s*[\d,]+\s+of\s+([\d,]+)\s*\)/.exec(textOf(markup));
  return m ? Number(m[1].replace(/,/g, "")) : 0;
}

/** The form action and ViewState a response carries — every response re-issues them. */
export function learn(markup: string): { action?: string; viewstate?: string } {
  const act = /id="searchResultsForm"[^>]*action="([^"]+)"/.exec(markup);
  let vs = [...markup.matchAll(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/g)].map(
    (m) => m[1],
  );
  if (!vs.length)
    vs = [...markup.matchAll(/<update id="[^"]*ViewState[^"]*"><!\[CDATA\[([^\]]+)\]\]>/g)].map(
      (m) => m[1],
    );
  return {
    action: act ? unescapeHtml(act[1]) : undefined,
    viewstate: vs.length ? unescapeHtml(vs[0]) : undefined,
  };
}

/** One NTRL search session: a cookie jar, a form action and the current ViewState. */
export class NtrlSession {
  static readonly PAGE = 100;
  action = "";
  viewstate = "";

  constructor(
    private readonly http: HttpClient,
    readonly jar: CookieJar,
    private readonly signal?: AbortSignal,
  ) {}

  private absorb(markup: string): void {
    const { action, viewstate } = learn(markup);
    if (action) this.action = action;
    if (viewstate) this.viewstate = viewstate;
  }

  /** GET page 1. */
  async firstPage(query: string): Promise<{ rows: SearchRow[]; total: number }> {
    const response = await this.http.request({
      url: `${SEARCH}?searchQuery=${encodeURIComponent(query).replace(/%20/g, "+")}`,
      accept: "text/html",
      cookieJar: this.jar,
      timeoutMs: 120_000,
      signal: this.signal,
    });
    if (response.status !== 200) throw new Error(`NTRL search: HTTP ${response.status}`);
    const body = await response.text();
    this.absorb(body);
    if (!this.action) throw new Error("NTRL search: the results form was not in the response");
    return { rows: rowsOf(body), total: totalOf(body) };
  }

  /** A pagination POST for the window starting at `first`. */
  async page(first: number, rows = NtrlSession.PAGE): Promise<SearchRow[]> {
    const table = "searchResultsForm:searchResultsTable";
    const body = new URLSearchParams({
      "javax.faces.partial.ajax": "true",
      "javax.faces.source": table,
      "javax.faces.partial.execute": table,
      "javax.faces.partial.render": table,
      [table]: table,
      [`${table}_pagination`]: "true",
      [`${table}_first`]: String(first),
      [`${table}_rows`]: String(rows),
      [`${table}_encodeFeature`]: "true",
      [`${table}_rppDD`]: String(rows),
      searchResultsForm: "searchResultsForm",
      "javax.faces.ViewState": this.viewstate,
    });
    const response = await this.http.request({
      url: NTRL + this.action,
      method: "POST",
      body,
      accept: "text/xml",
      headers: { "Faces-Request": "partial/ajax" },
      cookieJar: this.jar,
      timeoutMs: 180_000,
      signal: this.signal,
    });
    if (response.status !== 200) throw new Error(`NTRL paging: HTTP ${response.status}`);
    const text = await response.text();
    this.absorb(text);
    return rowsOf(text);
  }

  /** Every result row for a query, paged, up to `limit` (0 = all). */
  async walk(
    query: string,
    limit = 0,
    opts: { delay?: number; sleep?: (s: number) => Promise<void>; log?: (m: string) => void } = {},
  ): Promise<{ rows: SearchRow[]; total: number }> {
    const { rows: got, total } = await this.firstPage(query);
    const rows = [...got];
    const seen = new Set(rows.map((r) => r.accession));
    opts.log?.(`  ${rows.length} of ${total} record(s)`);
    if (limit && rows.length >= limit) return { rows: rows.slice(0, limit), total };
    let first = rows.length;
    while (first < total) {
      if (opts.delay && opts.sleep) await opts.sleep(Math.min(opts.delay, 2));
      const page = await this.page(first);
      if (!page.length) break;
      const fresh = page.filter((r) => !seen.has(r.accession));
      for (const r of fresh) seen.add(r.accession);
      rows.push(...fresh);
      opts.log?.(`  ${rows.length} of ${total} record(s)`);
      first += page.length;
      if (limit && rows.length >= limit) break;
    }
    return { rows: limit ? rows.slice(0, limit) : rows, total };
  }
}

export interface DetailRecord {
  accession: string;
  url: string;
  title: string;
  fields: Record<string, string>;
  downloads: { id: string; label: string }[];
  action: string;
  viewstate: string;
}

function formOf(body: string, name: string): string {
  const i = body.indexOf(`id="${name}"`);
  if (i < 0) return "";
  const j = body.indexOf("</form>", i);
  return body.slice(i, j > 0 ? j : body.length);
}

/** The detail table: each row is a bold label cell and a value cell (a span, or a datalist). */
export function fieldsOf(form: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of form.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (cells.length < 2 || !cells[0].includes('Label"')) continue;
    const label = textOf(cells[0]).replace(/:$/, "");
    const items = [...cells[1].matchAll(/class="ui-datalist-item"[^>]*>([\s\S]*?)<\/li>/g)]
      .map((m) => textOf(m[1]))
      .filter(Boolean);
    const value = items.length ? [...new Set(items)].join("; ") : textOf(cells[1]);
    if (label) out[label] = value;
  }
  return out;
}

/** Parses a title-detail page. */
export function parseDetail(accession: string, body: string): DetailRecord {
  const form = formOf(body, "detailsForm");
  const title = /id="detailsForm:itemTitle"[^>]*>([\s\S]*?)<\/span>/.exec(form);
  const bar = formOf(body, "detailsTBarForm");
  const seen = new Set<string>();
  const downloads: { id: string; label: string }[] = [];
  for (const m of bar.matchAll(/id="(detailsTBarForm:[^"]+)"[^>]*aria-label="(Download[^"]*)"/g)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    downloads.push({ id: m[1], label: textOf(m[2]) });
  }
  const act = /id="detailsTBarForm"[^>]*action="([^"]+)"/.exec(body);
  const vs = /name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/.exec(bar);
  return {
    accession,
    url: detailUrl(accession),
    title: textOf(title?.[1]),
    fields: fieldsOf(form),
    downloads,
    action: act ? unescapeHtml(act[1]) : "",
    viewstate: vs ? unescapeHtml(vs[1]) : "",
  };
}

/** The title-detail page of one accession number. Stateless; a jar is optional. */
export async function detail(
  http: HttpClient,
  accession: string,
  jar?: CookieJar,
  signal?: AbortSignal,
): Promise<DetailRecord> {
  const response = await http.request({
    url: detailUrl(accession),
    accept: "text/html",
    cookieJar: jar,
    timeoutMs: 120_000,
    signal,
  });
  if (response.status !== 200) throw new Error(`http ${response.status}`);
  return parseDetail(accession, await response.text());
}
