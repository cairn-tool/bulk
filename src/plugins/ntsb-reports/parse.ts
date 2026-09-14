import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { byteCompare } from "../../text/bytes.js";

export const SITE = "https://www.ntsb.gov";
export const LIST_URL =
  SITE +
  "/investigations/AccidentReports/_api/web/Lists/Reports/items" +
  "?%24top=5000&%24orderby=Report_x0020_Date_x0020_Adopted%20desc&%24expand=File";

/** Report-number series → mode, for the few list items whose Mode is empty. */
const SERIES_MODE: Record<string, string> = {
  AAR: "Aviation",
  AAB: "Aviation",
  AIR: "Aviation",
  ASR: "Aviation",
  SS: "Aviation",
  SIR: "Aviation",
  SPC: "Aviation",
  SR: "Aviation",
  CAB: "Aviation",
  MAR: "Marine",
  MAB: "Marine",
  MIR: "Marine",
  HAR: "Highway",
  HAB: "Highway",
  HIR: "Highway",
  HZM: "Hazmat",
  HZB: "Hazmat",
  RAR: "Railroad",
  RAB: "Railroad",
  RIR: "Railroad",
  RHR: "Railroad",
  RSR: "Railroad",
  PAR: "Pipeline",
  PAB: "Pipeline",
  PIR: "Pipeline",
};

export interface ListItem {
  Id?: number;
  Title?: string;
  NTSBReportNumber?: string;
  NTSBAccidentID?: string;
  NTSBKey?: string;
  Mode?: string | { results?: string[] } | null;
  Report_x0020_Date_x0020_Adopted?: string;
  Accident_x0020_Date?: string;
  Modified?: string;
  File?: {
    Name?: string;
    ServerRelativeUrl?: string;
    Length?: string | number;
    TimeLastModified?: string;
  };
}

export interface ListDocument {
  d: { results: ListItem[]; __next?: string };
}

export function parseList(text: string): { items: ListItem[]; paged: boolean } {
  const data = JSON.parse(text) as ListDocument;
  if (!data?.d?.results)
    throw new Error("the Reports list did not have the expected d.results shape");
  return { items: data.d.results, paged: Boolean(data.d.__next) };
}

export function modeOf(item: ListItem, stem: string): { mode: string; modes: string } {
  const raw = item.Mode;
  const modes = (typeof raw === "object" && raw ? (raw.results ?? []) : raw ? [raw] : []).filter(
    Boolean,
  ) as string[];
  if (modes.length) return { mode: modes[0], modes: modes.join("/") };
  const series = (/^[A-Za-z]+/.exec(stem)?.[0] ?? "").toUpperCase();
  for (const key of Object.keys(SERIES_MODE).sort((a, b) => b.length - a.length))
    if (series.startsWith(key)) return { mode: SERIES_MODE[key], modes: "" };
  return { mode: "Unclassified", modes: "" };
}

export function buildItems(listItems: readonly ListItem[]): Item[] {
  const items: Item[] = [];
  for (const it of listItems) {
    const file = it.File ?? {};
    const rel = file.ServerRelativeUrl;
    if (!rel) continue;
    const name = file.Name ?? "";
    const dot = name.lastIndexOf(".");
    const stem = (dot === -1 ? name : name.slice(0, dot)).trim();
    const ext = (dot === -1 ? "" : name.slice(dot).toLowerCase()) || ".pdf";
    const { mode, modes } = modeOf(it, stem);
    const title = cleanTitle(it.Title);
    const base = safeName(title ? `${stem} - ${title}` : stem);
    items.push({
      dest: `${mode}/${base}${ext}`,
      url: SITE + encodeURI(rel),
      bytes: Number(file.Length ?? 0) || 0,
      extra: {
        mode,
        stem,
        modes,
        report_number: (it.NTSBReportNumber ?? "").trim(),
        accident_id: (it.NTSBAccidentID ?? "").trim(),
        mkey: (it.NTSBKey ?? "").trim(),
        adopted: (it.Report_x0020_Date_x0020_Adopted ?? "").slice(0, 10),
        accident_date: (it.Accident_x0020_Date ?? "").slice(0, 10),
        title,
        modified: file.TimeLastModified ?? it.Modified ?? "",
        list_id: it.Id ?? null,
      },
    });
  }
  dedupeDests(items);
  items.sort(
    (a, b) =>
      byteCompare(String(a.extra.mode), String(b.extra.mode)) || byteCompare(a.dest, b.dest),
  );
  return items;
}
