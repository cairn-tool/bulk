import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { byteCompare } from "../../text/bytes.js";
import { parseXml, xmlArray, xmlText } from "../../text/xml.js";

export const BASE = "https://e-publishing.cern.ch/index.php/CYR";
export const OAI = `${BASE}/oai`;

export interface YellowRecord {
  doi: string;
  report_number: string;
  title: string;
  authors: string;
  date: string;
  article: string;
  galley: string;
  formats: string[];
}

/** One OAI-PMH ListRecords page → its oai_dc records and the resumption token. */
export function parsePage(xml: string): {
  records: YellowRecord[];
  token?: string;
  total?: number;
} {
  const doc = parseXml(xml, {
    arrays: ["record", "identifier", "relation", "source", "title", "creator", "date", "format"],
  });
  const root = (doc["OAI-PMH"] ?? {}) as Record<string, unknown>;
  const list = (root.ListRecords ?? {}) as Record<string, unknown>;
  const records: YellowRecord[] = [];
  for (const rec of xmlArray<Record<string, unknown>>(list.record)) {
    const dc = ((rec.metadata as Record<string, unknown>)?.dc ?? undefined) as
      Record<string, unknown> | undefined;
    if (!dc) continue;
    const texts = (key: string): string[] => xmlArray(dc[key]).map(xmlText).filter(Boolean);
    const ids = texts("identifier");
    const doi = ids.find((x) => x.startsWith("10.")) ?? "";
    const article = ids.find((x) => x.includes("/article/view/")) ?? "";
    const galleys = texts("relation").filter((x) => x.includes("/article/view/"));
    const source = texts("source").find((x) => x.startsWith("10.")) ?? "";
    const report = (source.includes("/") ? (source.split("/").pop() ?? "") : source).replace(
      "10.5170/",
      "",
    );
    records.push({
      doi,
      report_number: report,
      title: texts("title").join(" "),
      authors: texts("creator").join("; "),
      date: texts("date")[0] ?? "",
      article,
      galley: galleys[0] ?? "",
      formats: texts("format"),
    });
  }
  const tokenNode = list.resumptionToken as Record<string, unknown> | string | undefined;
  const token = xmlText(tokenNode).trim() || undefined;
  const total =
    typeof tokenNode === "object" && tokenNode
      ? Number(tokenNode["@_completeListSize"] ?? 0) || undefined
      : undefined;
  return { records, token, total };
}

export function itemsFor(records: readonly YellowRecord[]): Item[] {
  const items: Item[] = [];
  for (const r of records) {
    if (!r.galley || !r.formats.some((f) => f.includes("application/pdf"))) continue;
    // galley view URL …/article/view/<art>/<galley> → download URL …/article/download/<art>/<galley>
    const m = /\/article\/view\/(\d+)\/(\d+)/.exec(r.galley);
    if (!m) continue;
    const [, art, gal] = m;
    const report = r.report_number || "CYR";
    const tail = /\.(\d+)$/.exec(r.doi)?.[1] ?? art; // the article's tail in the issue DOI (…-001.95); else the article id
    const name = safeName(`${report}.${tail} - ${cleanTitle(r.title)}`);
    items.push({
      dest: `${report}/${name}.pdf`,
      url: `${BASE}/article/download/${art}/${gal}`,
      extra: {
        doi: r.doi,
        report_number: r.report_number,
        title: r.title,
        authors: r.authors,
        date: r.date,
        article: art,
        galley: gal,
        list_id: `${art}-${gal}`,
      },
    });
  }
  dedupeDests(items);
  items.sort((a, b) => byteCompare(a.dest, b.dest));
  return items;
}
