import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { textOf, unescapeHtml } from "../../text/html.js";

export const BASE = "https://data.ntsb.gov";
export const SEARCH = `${BASE}/Docket/Forms/searchdocket`;
export const DOCKET_COLUMNS = [
  "project_id",
  "ntsb_number",
  "date",
  "city_state",
  "type",
  "description",
] as const;
export const ITEM_COLUMNS = [
  "dest",
  "url",
  "docket",
  "sub_docket",
  "item",
  "title",
  "pages",
  "photos",
  "type",
  "blob_id",
  "file_name",
  "redacted",
] as const;

const RESULT =
  /<tr>\s*<td width="10%"><h4><a target="_blank" href="([^"]+)">([^<]+)<\/a><\/h4><\/td>\s*<td[^>]*><p>([^<]*)<\/p><\/td>\s*<td[^>]*><p>([^<]*)<\/p><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
const ROW =
  /<tr>\s*<td><b>(\d+)<\/b><\/td>\s*<td>([\s\S]*?)<\/td>\s*<td><b>(\d*)<\/b><\/td>\s*<td>(\d*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>\s*<a target="_blank" href="([^"]+)">/g;

export interface DocketRow {
  project_id: string;
  ntsb_number: string;
  date: string;
  city_state: string;
  type: string;
  description: string;
}

export function antiforgeryToken(formHtml: string): string | undefined {
  return /name="__RequestVerificationToken" type="hidden" value="([^"]+)"/.exec(formHtml)?.[1];
}

export function searchForm(token: string, since: string, until: string): URLSearchParams {
  return new URLSearchParams({
    "SearchDocketCriteria.NTSBNumber": "",
    "SearchDocketCriteria.City": "",
    "SearchDocketCriteria.State": "",
    "SearchDocketCriteria.Mode": "",
    "SearchDocketCriteria.StartDate": since,
    "SearchDocketCriteria.EndDate": until,
    __RequestVerificationToken: token,
  });
}

/** Every docket row of the search result page. */
export function parseSearchResults(html: string): DocketRow[] {
  const rows: DocketRow[] = [];
  for (const m of html.matchAll(RESULT)) {
    const [, href, num, date, place, kind, desc] = m;
    rows.push({
      project_id: /ProjectID=(\d+)/.exec(href)?.[1] ?? "",
      ntsb_number: num.trim(),
      date: date.trim(),
      city_state: unescapeHtml(place).trim(),
      type: textOf(kind),
      description: textOf(desc),
    });
  }
  return rows;
}

/** `07/17/1996` → `1996-07-17`. */
export function iso(mdy: string): string {
  const m = /^(\d\d)\/(\d\d)\/(\d{4})/.exec(mdy ?? "");
  return m ? `${m[3]}-${m[1]}-${m[2]}` : "";
}

export interface Selection {
  ntsbNumber?: string[];
  project?: string[];
  office?: string[];
  mode?: string[];
  since?: string;
  until?: string;
}

export type ChosenDocket = DocketRow & { sub_dockets: number };

/** One row per project, filtered; a project with several sub-dockets appears once. */
export function selectDockets(rows: readonly DocketRow[], opts: Selection): ChosenDocket[] {
  const projects = new Map<string, DocketRow[]>();
  for (const r of rows) {
    const group = projects.get(r.project_id);
    if (group) group.push(r);
    else projects.set(r.project_id, [r]);
  }
  const chosen: ChosenDocket[] = [];
  const named = Boolean(opts.ntsbNumber?.length || opts.project?.length);
  for (const [pid, group] of projects) {
    const r = group[0];
    if (
      opts.ntsbNumber?.length &&
      !opts.ntsbNumber.includes(r.ntsb_number) &&
      !(opts.project ?? []).includes(pid)
    )
      continue;
    if (
      opts.project?.length &&
      !opts.project.includes(pid) &&
      !(opts.ntsbNumber ?? []).includes(r.ntsb_number)
    )
      continue;
    if (!named) {
      if (
        opts.office?.length &&
        !opts.office.some((o) => r.ntsb_number.toUpperCase().startsWith(o.toUpperCase()))
      )
        continue;
      if (
        opts.mode?.length &&
        !opts.mode.some((m) => r.type.toLowerCase().startsWith(m.toLowerCase()))
      )
        continue;
      const d = iso(r.date);
      if (opts.since && d < opts.since) continue;
      if (opts.until && d > opts.until) continue;
    }
    chosen.push({ ...r, sub_dockets: group.length });
  }
  return chosen;
}

export interface SubDocket {
  description: string;
  last_modified: string;
  release: string;
  items: number;
}

export interface DocketHeader {
  [key: string]: unknown;
  sub_dockets: SubDocket[];
}

export interface DocketItem {
  sub_docket: string;
  item: number;
  title: string;
  pages: string;
  photos: string;
  type: string;
  blob_id: string;
  file_name: string;
  href: string;
  ext: string;
  redacted: boolean;
}

/** The header fields and the items of a docket page, sub-docket by sub-docket. */
export function parseDocket(page: string): { header: DocketHeader; items: DocketItem[] } {
  const header: DocketHeader = { sub_dockets: [] };
  for (const k of [
    "Description",
    "Mode",
    "NTSB Number",
    "Date of Accident",
    "City",
    "State/Region",
    "Country",
    "Project Type",
  ]) {
    const m = new RegExp(
      `<b>${k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}:</b>\\s*([\\s\\S]*?)\\s*</h3>`,
    ).exec(page);
    if (m) header[k] = textOf(m[1]);
  }
  // The page repeats a header block then an item table for every sub-docket.
  const blocks = page.split(/(?=<h3><b>Description:<\/b>)/).slice(1);
  const items: DocketItem[] = [];
  for (const b of blocks.length ? blocks : [page]) {
    const desc = /<b>Description:<\/b>\s*([\s\S]*?)\s*<\/h3>/.exec(b);
    const sub: SubDocket = {
      description: desc ? textOf(desc[1]) : "",
      last_modified: textOf(/Last Modified:<\/b>\s*([^<]*)/.exec(b)?.[1]),
      release: textOf(/Public Release Date & Time:\s*([^<]*)/.exec(b)?.[1]),
      items: Number(/Docket Items:\s*(\d+)/.exec(b)?.[1] ?? 0),
    };
    header.sub_dockets.push(sub);
    for (const m of b.matchAll(ROW)) {
      const [, num, title, pages, photos, kind, href] = m;
      const h = unescapeHtml(href);
      const fileName = decodeURIComponent(/FileName=([^&]*)/.exec(h)?.[1] ?? "");
      const extParam = (/FileExtension=([^&]*)/.exec(h)?.[1] ?? "")
        .toLowerCase()
        .replace(/^\./, "");
      const dot = fileName.lastIndexOf(".");
      items.push({
        sub_docket: sub.description,
        item: Number(num),
        title: textOf(title),
        pages,
        photos,
        type: textOf(kind),
        blob_id: /ID=(\d+)/.exec(h)?.[1] ?? "",
        file_name: fileName,
        href: BASE + h,
        ext: extParam || (dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase()) || "pdf",
        redacted: /-Redacted(?:-Rel)?\.\w+$/i.test(fileName),
      });
    }
  }
  return { header, items };
}

export function docketFolder(r: {
  ntsb_number: string;
  description: string;
  city_state: string;
}): string {
  const desc = cleanTitle(r.description) || r.city_state;
  return safeName(`${r.ntsb_number} - ${desc}`, 120);
}

export function docketItems(
  folder: string,
  r: DocketRow,
  header: DocketHeader,
  items: readonly DocketItem[],
  pdfOnly: boolean,
): Item[] {
  const multi = header.sub_dockets.length > 1;
  const out: Item[] = [];
  for (const it of items) {
    if (pdfOnly && it.ext !== "pdf") continue;
    let sub = "";
    if (multi && it.sub_docket)
      sub =
        safeName(
          cleanTitle(
            it.sub_docket
              .replace(String(header.Description ?? ""), "")
              .replace(/^[ -]+|[ -]+$/g, ""),
          ),
          100,
        ) || "Main";
    const title = cleanTitle(it.title) || `item ${it.item}`;
    const name = safeName(
      `${String(it.item).padStart(4, "0")} - ${title}${it.redacted ? " (Redacted)" : ""}`,
    );
    out.push({
      dest: [folder, sub, `${name}.${it.ext}`].filter(Boolean).join("/"),
      url: it.href,
      extra: {
        docket: r.ntsb_number,
        sub_docket: it.sub_docket,
        item: it.item,
        title: it.title,
        pages: it.pages,
        photos: it.photos,
        type: it.type,
        blob_id: it.blob_id,
        file_name: it.file_name,
        redacted: it.redacted,
        list_id: it.blob_id,
      },
    });
  }
  dedupeDests(out);
  return out;
}
