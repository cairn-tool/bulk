export interface NtrsCitation {
  id?: number | string;
  title?: string;
  subtitle?: string;
  otherReportNumbers?: (string | { otherReportNumber?: string })[];
  publications?: { publicationDate?: string }[];
  created?: string;
  authorAffiliations?: { meta?: { author?: { name?: string } } }[];
  center?: { code?: string };
  stiTypeDetails?: string;
}

export function recordOf(j: NtrsCitation): Record<string, unknown> {
  const numbers = new Set<string>();
  for (const o of j.otherReportNumbers ?? []) {
    const s = typeof o === "string" ? o : (o.otherReportNumber ?? "");
    if (s) numbers.add(s.replace(/^Report Number: /, ""));
  }
  return {
    id: j.id ?? null,
    title: j.title ?? null,
    subtitle: j.subtitle ?? null,
    reportNumbers: [...numbers].sort(),
    date: j.publications?.[0]?.publicationDate ?? j.created ?? null,
    authors: (j.authorAffiliations ?? [])
      .map((a) => a?.meta?.author?.name)
      .filter((n): n is string => Boolean(n)),
    center: j.center?.code ?? null,
    stiType: j.stiTypeDetails ?? null,
    url: `https://ntrs.nasa.gov/citations/${String(j.id ?? "")}`,
  };
}

export function words(text: string | undefined | null): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 3),
  );
}

/** Word overlap between a query and a title, 0..1. */
export function score(query: string, title: string | undefined): number {
  const a = words(query);
  const b = words(title);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / Math.max(a.size, b.size);
}

/** The search text for a title: parentheticals and volume suffixes dropped, capped at 150 characters. */
export function searchText(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+-\s+(Vol|Volume|Part|Book|Final Report).*$/, "")
    .slice(0, 150);
}
