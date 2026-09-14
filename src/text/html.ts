import * as cheerio from "cheerio";

export type Document = ReturnType<typeof cheerio.load>;

export function loadHtml(html: string): Document {
  return cheerio.load(html);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodes the entities that turn up in server-rendered attribute values and text. */
export function unescapeHtml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Tags stripped, entities decoded, whitespace collapsed — the Python `_text()` helper. */
export function textOf(fragment: string | null | undefined): string {
  return unescapeHtml((fragment ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
