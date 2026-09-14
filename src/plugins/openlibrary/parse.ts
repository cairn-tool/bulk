export function isbn13Ok(s: string): boolean {
  if (s.length !== 13 || !/^\d{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

export function isbn10Ok(s: string): boolean {
  if (!/^\d{9}[\dXx]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = s[i];
    sum += (10 - i) * (c === "X" || c === "x" ? 10 : Number(c));
  }
  return sum % 11 === 0;
}

export function to13(s: string): string {
  const core = "978" + s.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - (sum % 10)) % 10);
}

/** A key as typed → canonical ISBN-13, or null if it is not a valid ISBN. */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[-\s]/g, "");
  if (isbn13Ok(s)) return s;
  if (isbn10Ok(s)) return to13(s);
  return null;
}

/** Every ISBN mentioned in a text, as ISBN-13s, in order of first appearance. */
export function findIsbns(text: string): string[] {
  const out: string[] = [];
  const labelled = /ISBN[-\s:]*(?:1[03][-\s:]*)?((?:97[89][-\s]?)?\d[\d\-\s]{8,16}[\dXx])/gi;
  for (const m of text.matchAll(labelled)) {
    const raw = m[1].replace(/[-\s]/g, "");
    for (const candidate of [raw, raw.slice(0, 13), raw.slice(0, 10)]) {
      const n = normalizeIsbn(candidate);
      if (n) {
        out.push(n);
        break;
      }
    }
  }
  for (const m of text.matchAll(/\b(97[89]\d{10})\b/g)) if (isbn13Ok(m[1])) out.push(m[1]);
  return [...new Set(out)];
}

interface Named {
  name?: string;
}

export interface OpenLibraryBook {
  title?: string;
  subtitle?: string;
  authors?: Named[];
  publish_date?: string;
  publishers?: Named[];
  number_of_pages?: number;
  subjects?: Named[];
  url?: string;
}

export function recordOf(book: OpenLibraryBook): Record<string, unknown> {
  return {
    title: book.title ?? null,
    subtitle: book.subtitle ?? null,
    authors: (book.authors ?? []).map((a) => a.name).filter(Boolean),
    date: book.publish_date ?? null,
    publishers: (book.publishers ?? []).map((p) => p.name).filter(Boolean),
    pages: book.number_of_pages ?? null,
    subjects: (book.subjects ?? [])
      .map((s) => s.name)
      .filter(Boolean)
      .slice(0, 12),
    url: book.url ?? null,
  };
}
