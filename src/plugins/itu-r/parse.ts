import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { textOf } from "../../text/html.js";

export const SERIES: Record<string, string> = {
  BO: "Satellite delivery",
  BR: "Recording for production, archival and play-out; film for television",
  BS: "Broadcasting service (sound)",
  BT: "Broadcasting service (television)",
  F: "Fixed service",
  M: "Mobile, radiodetermination, amateur and related satellite services",
  P: "Radiowave propagation",
  RA: "Radio astronomy",
  RS: "Remote sensing systems",
  S: "Fixed-satellite service",
  SA: "Space applications and meteorology",
  SF: "Frequency sharing and coordination between fixed-satellite and fixed service systems",
  SM: "Spectrum management",
  SNG: "Satellite news gathering",
  TF: "Time signals and frequency standards emissions",
  V: "Vocabulary and related subjects",
};
export const HELD = "BO BS BT F M SF".split(" ");

export const seriesUrl = (s: string): string => `https://www.itu.int/rec/R-REC-${s}/en`;
export const recUrl = (rec: string): string => `https://www.itu.int/rec/${rec}/en`;

export interface Edition {
  series: string;
  rec: string;
  edition_id: string;
  date: string;
  title: string;
  status: string;
}

/** The Recommendations a series page links (`parent=R-REC-M.1036`), main entries only. */
export function recommendationsOf(series: string, listHtml: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(`parent=(R-REC-${series}\\.[0-9A-Za-z.-]+)"`, "g");
  for (const m of listHtml.matchAll(re)) {
    const rec = m[1];
    const tail = rec.split(".").slice(1).join(".");
    if (!tail.includes("-")) found.add(rec);
  }
  return [...found].sort();
}

/** Every edition row on a Recommendation page. */
export function editionsOf(series: string, rec: string, pageHtml: string): Edition[] {
  const body = pageHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const rows: Edition[] = [];
  for (const tr of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const m = /parent=(R-REC-[^"&]+-(\d{6})-[A-Z])"/.exec(tr[1]);
    if (!m) continue;
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => textOf(c[1]));
    rows.push({
      series,
      rec,
      edition_id: m[1],
      date: m[2],
      title: cells[1] ?? "",
      status: cells[2] ?? "",
    });
  }
  return rows;
}

export function itemsFor(rows: readonly Edition[]): Item[] {
  const items: Item[] = [];
  for (const r of rows) {
    const m = /^R-REC-([A-Z]+\.[\d.]+)-(\d+)-(\d{4})(\d{2})-[A-Z]$/.exec(r.edition_id);
    if (!m) continue;
    const name = `ITU-R ${m[1]}-${m[2]} (${m[3]}-${m[4]}) - ${cleanTitle(r.title)}`;
    items.push({
      dest: `${r.series}-Series - ${SERIES[r.series] ?? r.series}/${safeName(name)}.pdf`,
      url: `https://www.itu.int/dms_pubrec/itu-r/rec/${r.series.toLowerCase()}/${r.edition_id}!!PDF-E.pdf`,
      extra: { ...r, list_id: r.edition_id },
    });
  }
  dedupeDests(items);
  return items;
}
