import type { Item } from "../../plugin/types.js";
import { unescapeHtml } from "../../text/html.js";

export const PAGE = "https://data.ntsb.gov/avdata/";
const ROW =
  /<td id="fileName">([^<]+)<\/td>\s*<td id="fileDate">([^<]+)<\/td>\s*<td id="fileSize">(\d+)<\/td>\s*<td>\s*<a href="([^"]+)">/g;

export interface AvdataRow {
  name: string;
  listed: string;
  bytes: number;
  url: string;
}

export function parseListing(html: string): AvdataRow[] {
  return [...html.matchAll(ROW)].map((m) => ({
    name: m[1].trim(),
    listed: m[2].trim(),
    bytes: Number(m[3]),
    url: "https://data.ntsb.gov" + unescapeHtml(m[4]),
  }));
}

/** `9/1/2026 12:00:00 AM` → `2026-09-01`. */
export function iso(listed: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(listed);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : "undated";
}

export function itemsFor(rows: readonly AvdataRow[]): Item[] {
  return rows.map((r) => {
    const dot = r.name.lastIndexOf(".");
    const stem = dot === -1 ? r.name : r.name.slice(0, dot);
    const ext = dot === -1 ? "" : r.name.slice(dot).toLowerCase();
    return {
      dest: `${stem} (${iso(r.listed)})${ext}`,
      url: r.url,
      bytes: r.bytes,
      extra: { name: r.name, listed_date: iso(r.listed), list_id: r.name },
    };
  });
}
