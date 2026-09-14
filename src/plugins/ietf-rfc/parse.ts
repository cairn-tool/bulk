import type { Item } from "../../plugin/types.js";
import { cleanTitle, safeName } from "../../pull/naming.js";
import { parseXml, xmlArray, xmlText } from "../../text/xml.js";

export const INDEX_URL = "https://www.rfc-editor.org/rfc-index.xml";

export interface RfcRow {
  number: number;
  title: string;
  date: string;
  status: string;
  formats: string;
}

export function parseIndex(xml: string): RfcRow[] {
  const doc = parseXml(xml, { arrays: ["rfc-entry", "file-format", "format"] });
  const index = (doc["rfc-index"] ?? {}) as Record<string, unknown>;
  const rows: RfcRow[] = [];
  for (const e of xmlArray<Record<string, unknown>>(index["rfc-entry"])) {
    const number = Number(xmlText(e["doc-id"]).replace("RFC", ""));
    if (!Number.isFinite(number)) continue;
    const date = (e.date ?? {}) as Record<string, unknown>;
    const formats = xmlArray<Record<string, unknown>>(e.format)
      .flatMap((f) => xmlArray(f["file-format"]).map(xmlText))
      .filter(Boolean);
    rows.push({
      number,
      title: xmlText(e.title),
      date: e.date ? `${xmlText(date.year)}-${xmlText(date.month).slice(0, 3)}` : "",
      status: xmlText(e["current-status"]),
      formats: formats.join(","),
    });
  }
  rows.sort((a, b) => a.number - b.number);
  return rows;
}

/** The RFC numbers a folder already holds, from `RFC <n> …` file names. */
export function presentNumbers(names: Iterable<string>): Set<number> {
  const out = new Set<number>();
  for (const name of names) {
    const m = /^RFC\s*(\d+)\b/i.exec(name);
    if (m) out.add(Number(m[1]));
  }
  return out;
}

export function itemsFor(rows: readonly RfcRow[]): Item[] {
  return rows.map((r) => {
    const n = r.number;
    const thousand = Math.floor(n / 1000);
    const folder = `RFC ${thousand}000-${thousand}999`;
    const base = safeName(`RFC ${n} - ${cleanTitle(r.title)}`);
    const txtPdf = `https://www.rfc-editor.org/rfc/pdfrfc/rfc${n}.txt.pdf`;
    const txt = `https://www.rfc-editor.org/rfc/rfc${n}.txt`;
    return {
      dest: `${folder}/${base}.pdf`,
      url: `https://www.rfc-editor.org/rfc/rfc${n}.pdf`,
      fallbacks: [{ url: txtPdf }, { url: txt, dest: `${folder}/${base}.txt` }],
      extra: {
        number: n,
        title: r.title,
        date: r.date,
        status: r.status,
        formats: r.formats,
        fallbacks: `${txtPdf} ${txt}`,
        list_id: n,
      },
    };
  });
}
