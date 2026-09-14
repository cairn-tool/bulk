import { parseXml, xmlArray, xmlText } from "../../text/xml.js";

export const BASE = "https://cds.cern.ch";
export const OAI = `${BASE}/oai2d`;
export const HOST = "cds.cern.ch";

export type MarcRecord = Record<string, unknown>;

/** Whether a body is the Anubis challenge page rather than the document. */
export function challenged(text: string): boolean {
  return (
    text.slice(0, 2000).includes("Making sure you") &&
    text.slice(0, 6000).toLowerCase().includes("anubis")
  );
}

const ARRAYS = ["record", "datafield", "subfield", "controlfield", "header"];

/** OAI-PMH ListRecords / GetRecord → `[id, marc record]` pairs plus the resumption token or error. */
export function parseOai(xml: string): {
  records: [string, MarcRecord][];
  token?: string;
  total?: number;
  error?: string;
} {
  const doc = parseXml(xml, { arrays: ARRAYS });
  const root = (doc["OAI-PMH"] ?? {}) as Record<string, unknown>;
  const err = root.error as Record<string, unknown> | string | undefined;
  if (err)
    return {
      records: [],
      error: `${typeof err === "object" ? String(err["@_code"] ?? "") : ""} ${xmlText(err)}`.trim(),
    };
  const body = (root.ListRecords ?? root.GetRecord ?? {}) as Record<string, unknown>;
  const records: [string, MarcRecord][] = [];
  for (const rec of xmlArray<Record<string, unknown>>(body.record)) {
    const header = xmlArray<Record<string, unknown>>(rec.header)[0] ?? {};
    const ident = xmlText(header.identifier);
    const marc = xmlArray<MarcRecord>(
      (rec.metadata as Record<string, unknown> | undefined)?.record,
    )[0];
    if (marc) records.push([ident.split(":").pop() ?? ident, marc]);
  }
  const tokenNode = body.resumptionToken as Record<string, unknown> | string | undefined;
  const token = xmlText(tokenNode).trim() || undefined;
  const total =
    typeof tokenNode === "object" && tokenNode
      ? Number(tokenNode["@_completeListSize"] ?? 0) || undefined
      : undefined;
  return { records, token, total };
}

/** The `/search?of=xm` output: a `<collection>` of bare `<record>`s, with the total in a comment. */
export function parseSearch(xml: string): { records: [string, MarcRecord][]; total?: number } {
  const doc = parseXml(xml, { arrays: ARRAYS });
  const collection = (doc.collection ?? doc) as Record<string, unknown>;
  const records: [string, MarcRecord][] = [];
  for (const marc of xmlArray<MarcRecord>(collection.record)) {
    const cid = xmlArray<Record<string, unknown>>(marc.controlfield).find(
      (c) => c["@_tag"] === "001",
    );
    records.push([xmlText(cid), marc]);
  }
  const total = /Total-Number-Of-Results:\s*(\d+)/.exec(xml)?.[1];
  return { records, total: total ? Number(total) : undefined };
}

/** Every `$code` subfield of every `tag` datafield. */
export function field(marc: MarcRecord, tag: string, code: string): string[] {
  const out: string[] = [];
  for (const df of xmlArray<Record<string, unknown>>(marc.datafield)) {
    if (String(df["@_tag"]) !== tag) continue;
    for (const sf of xmlArray<Record<string, unknown>>(df.subfield)) {
      const text = xmlText(sf).trim();
      if (String(sf["@_code"]) === code && text) out.push(text);
    }
  }
  return out;
}

export interface MarcFile {
  url: string;
  bytes: number;
  label: string;
}

/** The 856 file links; the icon and pdf/a derivatives (?subformat=…) only with allFormats. */
export function filesOf(marc: MarcRecord, allFormats = false): MarcFile[] {
  const out: MarcFile[] = [];
  for (const df of xmlArray<Record<string, unknown>>(marc.datafield)) {
    if (String(df["@_tag"]) !== "856") continue;
    const sub: Record<string, string> = {};
    for (const sf of xmlArray<Record<string, unknown>>(df.subfield))
      sub[String(sf["@_code"])] = xmlText(sf).trim();
    const u = sub.u ?? "";
    if (u.startsWith("http") && u.includes("/files/") && (allFormats || !u.includes("?subformat=")))
      out.push({
        url: u,
        bytes: /^\d+$/.test(sub.s ?? "") ? Number(sub.s) : 0,
        label: sub.y ?? "",
      });
  }
  return out;
}

export interface Described {
  record: string;
  report_number: string;
  title: string;
  date: string;
  inspire: string;
}

export function describe(id: string, marc: MarcRecord): Described {
  const a = field(marc, "035", "a");
  const nine = field(marc, "035", "9");
  const inspire = a.filter((_, i) => (nine[i] ?? "").toLowerCase() === "inspire");
  return {
    record: id,
    report_number: field(marc, "037", "a")[0] ?? field(marc, "088", "a")[0] ?? "",
    title: field(marc, "245", "a")[0] ?? "",
    date: field(marc, "260", "c")[0] ?? field(marc, "269", "c")[0] ?? "",
    inspire: inspire[0] ?? "",
  };
}

/** A datafield-only snapshot of a record, so `_records/<id>.xml` holds the MARC without the OAI wrapper. */
export function marcXml(id: string, marc: MarcRecord): string {
  const esc = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const lines = [
    `<record xmlns="http://www.loc.gov/MARC21/slim">`,
    `  <controlfield tag="001">${esc(id)}</controlfield>`,
  ];
  for (const df of xmlArray<Record<string, unknown>>(marc.datafield)) {
    lines.push(
      `  <datafield tag="${esc(String(df["@_tag"] ?? ""))}" ind1="${esc(String(df["@_ind1"] ?? " "))}" ind2="${esc(String(df["@_ind2"] ?? " "))}">`,
    );
    for (const sf of xmlArray<Record<string, unknown>>(df.subfield))
      lines.push(
        `    <subfield code="${esc(String(sf["@_code"] ?? ""))}">${esc(xmlText(sf))}</subfield>`,
      );
    lines.push("  </datafield>");
  }
  lines.push("</record>");
  return lines.join("\n") + "\n";
}
