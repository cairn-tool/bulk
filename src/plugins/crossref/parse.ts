/** `10.x/y`, `doi:10.x/y`, `https://doi.org/10.x/y` → the bare DOI, or null. */
export function normalizeDoi(raw: string): string | null {
  let s = (raw ?? "").trim();
  s = s.replace(/^doi:\s*/i, "");
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return /^10\.\d{4,9}\/\S+$/.test(s) ? s : null;
}
