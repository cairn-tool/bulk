import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { parseXml, xmlArray, xmlText } from "../../text/xml.js";

export const DOI_PREFIX = "10.6028/";

export interface NistRecord {
  designation: string;
  series: string;
  title: string;
  authors: string;
  corporate: string;
  date: string;
  doi: string;
  url: string;
  genre: string;
  series_title: string;
  abstract: string;
  subjects: string;
}

export const RECORD_COLUMNS = [
  "designation",
  "series",
  "title",
  "authors",
  "date",
  "doi",
  "corporate",
  "subjects",
] as const;

/** `NIST.SP.800-53r5` → `NIST.SP`; `NBS.CIRC.e2` → `NBS.CIRC`. */
export function seriesOf(designation: string): string {
  const parts = (designation ?? "").replace(/ /g, ".").split(".");
  if (parts.length > 1 && !/^\d/.test(parts[1])) return `${parts[0]}.${parts[1]}`;
  return parts[0] || "unknown";
}

export function yearOf(value: string): string {
  return /(1[89]\d{2}|20\d{2})/.exec(value ?? "")?.[1] ?? "";
}

/** `NIST SP 800-53r5`, `nist.sp.800-53r5`, a DOI or a doi.org URL → `NIST.SP.800-53R5` (for matching). */
export function normalizeKey(key: string): string {
  let k = (key ?? "").trim();
  k = k.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  if (k.toLowerCase().startsWith(DOI_PREFIX)) k = k.slice(DOI_PREFIX.length);
  return k.replace(/\s+/g, ".").toUpperCase();
}

/** The query key: as `normalizeKey` but with case kept as written (DOIs are case-insensitive; `800-53r5` reads wrong shouted). */
export function normalizeDesignation(raw: string): string | null {
  let s = (raw ?? "").trim();
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  if (s.toLowerCase().startsWith(DOI_PREFIX)) s = s.slice(DOI_PREFIX.length);
  s = s
    .replace(/\.pdf$/i, "")
    .trim()
    .replace(/\s+/g, ".");
  return /^[A-Za-z][A-Za-z0-9.-]*$/.test(s) ? s : null;
}

interface ModsName {
  "@_type"?: string;
  namePart?: unknown;
}

/** One `<mods>` element's text → a record. */
export function recordOf(modsXml: string): NistRecord {
  const doc = parseXml(modsXml, {
    arrays: [
      "identifier",
      "name",
      "namePart",
      "subject",
      "topic",
      "relatedItem",
      "genre",
      "dateIssued",
      "url",
      "titleInfo",
    ],
  });
  const mods = (doc.mods ?? {}) as Record<string, unknown>;
  const identifiers = xmlArray<Record<string, unknown>>(mods.identifier);
  const doi = xmlText(identifiers.find((i) => i["@_type"] === "doi")) ?? "";
  const designation = doi.startsWith(DOI_PREFIX) ? doi.slice(DOI_PREFIX.length).trim() : doi.trim();
  const authors: string[] = [];
  const corporate: string[] = [];
  for (const name of xmlArray<ModsName>(mods.name)) {
    const parts = xmlArray(name.namePart)
      .map(xmlText)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) continue;
    const who = parts.join(" ");
    const bucket = name["@_type"] === "corporate" ? corporate : authors;
    if (!bucket.includes(who)) bucket.push(who);
  }
  const titleInfos = xmlArray<Record<string, unknown>>(mods.titleInfo);
  const main = titleInfos.find((t) => !t["@_type"]) ?? titleInfos[0] ?? {};
  const title = xmlText(main.title);
  const sub = xmlText(main.subTitle);
  const series = xmlArray<Record<string, unknown>>(mods.relatedItem).find(
    (r) => r["@_type"] === "series",
  );
  const seriesTitle = series
    ? xmlText(xmlArray<Record<string, unknown>>(series.titleInfo)[0]?.title)
    : "";
  const subjects: string[] = [];
  for (const s of xmlArray<Record<string, unknown>>(mods.subject))
    for (const t of xmlArray(s.topic).map(xmlText))
      if (t && !subjects.includes(t)) subjects.push(t);
  const origin = (mods.originInfo ?? {}) as Record<string, unknown>;
  const dates = xmlArray<unknown>(origin.dateIssued);
  const marc = dates.find(
    (d) => typeof d === "object" && d && (d as Record<string, unknown>)["@_encoding"] === "marc",
  );
  const date = yearOf(xmlText(marc ?? dates[0]));
  const location = (mods.location ?? {}) as Record<string, unknown>;
  const genre = xmlArray<unknown>(mods.genre).find(
    (g) => typeof g === "object" && g && (g as Record<string, unknown>)["@_authority"] === "marcgt",
  );
  return {
    designation,
    series: seriesOf(designation),
    title: title + (sub ? `: ${sub}` : ""),
    authors: authors.join("; "),
    corporate: corporate.join("; "),
    date,
    doi,
    url: xmlText(xmlArray(location.url)[0]) || (doi ? `https://doi.org/${doi}` : ""),
    genre: xmlText(genre),
    series_title: seriesTitle,
    abstract: xmlText(mods.abstract).slice(0, 1000),
    subjects: subjects.join("; ").slice(0, 300),
  };
}

export interface NistSelection {
  id?: string[];
  series?: string[];
  query?: string;
  author?: string;
  subject?: string;
  doi?: string;
  from?: string;
  until?: string;
}

export function hasSelection(opts: NistSelection): boolean {
  return Boolean(
    opts.id?.length ||
    opts.series?.length ||
    opts.query ||
    opts.author ||
    opts.subject ||
    opts.doi ||
    opts.from ||
    opts.until,
  );
}

export function matches(r: NistRecord, opts: NistSelection): boolean {
  const ids = new Set((opts.id ?? []).map(normalizeKey));
  const series = new Set((opts.series ?? []).map((s) => s.toUpperCase()));
  if (ids.size && !ids.has(normalizeKey(r.designation))) return false;
  const s = seriesOf(r.designation).toUpperCase();
  if (series.size && !series.has(s) && !series.has(s.split(".").pop() ?? "")) return false;
  if (opts.doi && (r.doi ?? "").toLowerCase() !== opts.doi.toLowerCase()) return false;
  if (
    opts.query &&
    !opts.query.split(/\s+/).every((w) => r.title.toLowerCase().includes(w.toLowerCase()))
  )
    return false;
  if (
    opts.author &&
    !`${r.authors} ${r.corporate}`.toLowerCase().includes(opts.author.toLowerCase())
  )
    return false;
  if (opts.subject && !r.subjects.toLowerCase().includes(opts.subject.toLowerCase())) return false;
  if (opts.from && (!r.date || r.date < String(opts.from))) return false;
  if (opts.until && (!r.date || r.date > String(opts.until))) return false;
  return true;
}

export function itemsFor(records: readonly NistRecord[]): Item[] {
  const items: Item[] = [];
  for (const r of records) {
    const folder = safeName(r.series || "unknown", 40);
    const human = r.designation.replace(".", " ").replace(".", " ");
    const name = safeName(`${cleanTitle(human)} - ${cleanTitle(r.title)}`);
    items.push({
      dest: `${folder}/${name}.pdf`,
      url: r.url,
      extra: { ...r, list_id: r.designation },
    });
  }
  dedupeDests(items);
  return items;
}
