import type { Item } from "../../plugin/types.js";
import { cleanTitle, safeName } from "../../pull/naming.js";
import { parseCsvRecords } from "../../text/csv.js";

export const API = "https://data.ntsb.gov/carol-main-public/api";
export const FIRST_YEAR = 1948;
export const CAP = 10000;

export interface QueryRule {
  FieldName?: string;
  Values?: unknown[];
  Operator?: string;
  [key: string]: unknown;
}
export interface QueryGroup {
  QueryRules?: QueryRule[];
  [key: string]: unknown;
}
export interface Template {
  QueryGroups: QueryGroup[];
  [key: string]: unknown;
}

/** The basic-search template with the EventDate rule filled, as CAROL's UI sends it. */
export function buildQuery(
  template: Template,
  sessionId: number,
  start: string,
  end: string,
  opts: { size?: number; offset?: number; export?: string } = {},
): Record<string, unknown> {
  const groups = JSON.parse(JSON.stringify(template.QueryGroups)) as QueryGroup[];
  for (const rule of groups[0]?.QueryRules ?? []) {
    if (rule.FieldName === "EventDate") {
      rule.Values = [start, end];
      rule.Operator = "is in the range";
    }
  }
  const q: Record<string, unknown> = {
    ResultSetSize: opts.size ?? 1,
    ResultSetOffset: opts.offset ?? 0,
    QueryGroups: groups,
    AndOr: "and",
    SortColumn: null,
    SortDescending: true,
    TargetCollection: "cases",
    SessionId: sessionId,
  };
  if (opts.export) {
    q.ExportFormat = opts.export;
    q.ResultSetSize = 500;
    delete q.ResultSetOffset;
  }
  return q;
}

export interface Period {
  year: number;
  month: number; // 0 = the whole year
  start: string;
  end: string;
  count: number;
}

export const tagOf = (p: Period): string =>
  `${p.year}${p.month ? `-${String(p.month).padStart(2, "0")}` : ""}`;

export function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function exportItems(
  template: Template,
  sessionId: number,
  periods: readonly Period[],
  formats: readonly string[],
  exported: string,
): Item[] {
  const items: Item[] = [];
  for (const p of periods) {
    if (p.count === 0) continue;
    for (const fmt of formats) {
      items.push({
        dest: `${p.year}/cases-${tagOf(p)}-${fmt}.zip`,
        url: `${API}/Query/FileExport`,
        request: {
          method: "POST",
          body: JSON.stringify(buildQuery(template, sessionId, p.start, p.end, { export: fmt })),
          headers: { "content-type": "application/json", accept: "application/json" },
        },
        extra: {
          year: p.year,
          month: p.month || "",
          format: fmt,
          count: p.count,
          exported,
          list_id: `${tagOf(p)}-${fmt}`,
        },
      });
    }
  }
  return items;
}

/** The generated report PDFs named in an exported summary CSV (carol-repgen links only). */
export function reportItems(year: number, csv: string): Item[] {
  const items: Item[] = [];
  for (const row of parseCsvRecords(csv)) {
    const url = (row.ReportUrl ?? "").trim();
    if (!url.includes("carol-repgen")) continue;
    const name = safeName(
      `${row.NtsbNo} - ${cleanTitle(row.Make ?? "")} ${cleanTitle(row.Model ?? "")}`.trim(),
    );
    items.push({
      dest: `${year}/reports/${name}.pdf`,
      url,
      extra: { ntsb_no: row.NtsbNo ?? "", mkey: row.Mkey ?? "", year, list_id: row.NtsbNo ?? "" },
    });
  }
  return items;
}
