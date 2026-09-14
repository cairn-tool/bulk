export const NAL_API = "https://search.nal.usda.gov/primaws/rest/pub/pnxs";
export const VID = "01NAL_INST:MAIN";
export const INST = "01NAL_INST";

interface Pnx {
  display?: Record<string, unknown[]>;
  addata?: Record<string, unknown[]>;
  control?: Record<string, unknown[]>;
}

export interface PnxDoc {
  pnx?: Pnx;
}

/**
 * A PNX display field. Values carry sub-fields after `$$`: `$$Q` is the
 * normalised heading, which for a name is the clean form ("Delaney, Mary") where
 * the plain value trails the author's whole affiliation. For a series the plain
 * value is the fuller one, so which half to take is the caller's choice.
 */
export function values(
  display: Record<string, unknown[]> | undefined,
  key: string,
  normalised = false,
): string[] {
  const out: string[] = [];
  for (const v of display?.[key] ?? []) {
    const raw = String(v);
    let text = "";
    if (normalised && raw.includes("$$Q")) text = raw.split("$$Q", 2)[1].split("$$")[0].trim();
    text = text || raw.split("$$")[0].trim();
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

const one = (display: Record<string, unknown[]> | undefined, key: string): string =>
  values(display, key)[0] ?? "";
const list = (addata: Record<string, unknown[]> | undefined, key: string): string[] =>
  (addata?.[key] ?? []).map(String);

export function recordOf(doc: PnxDoc): Record<string, unknown> {
  const pnx = doc.pnx ?? {};
  const { display, addata, control } = pnx;
  const id = String(control?.recordid?.[0] ?? "");
  return {
    id,
    title: one(display, "title"),
    creators: [...values(display, "creator", true), ...values(display, "contributor", true)],
    date: one(display, "creationdate"),
    publisher: one(display, "publisher"),
    type: one(display, "type"),
    language: one(display, "language"),
    series: one(display, "series"),
    ispartof: one(display, "ispartof"),
    isbn: list(addata, "isbn").join("; "),
    issn: list(addata, "issn").join("; "),
    doi: list(addata, "doi")[0] ?? "",
    oclc: list(addata, "oclcid")[0] ?? "",
    subjects: values(display, "subject").join("; ").slice(0, 300),
    collections: values(display, "lds51").join("; "),
    description: one(display, "description").slice(0, 500),
    url: `https://search.nal.usda.gov/discovery/fulldisplay?docid=${id}&vid=${encodeURIComponent(VID)}`,
  };
}

export function searchParams(
  text: string,
  field: string,
  scope: string,
  rows: number,
): URLSearchParams {
  return new URLSearchParams({
    blendFacetsSeparately: "false",
    getMore: "0",
    inst: INST,
    lang: "en",
    limit: String(rows),
    offset: "0",
    pcAvailability: "false",
    q: `${field},contains,${text}`,
    qExclude: "",
    qInclude: "",
    rtaLinks: "true",
    scope,
    searchInFulltext: "false",
    skipDelivery: "Y",
    sort: "rank",
    tab: "LibraryCatalog",
    vid: VID,
  });
}
