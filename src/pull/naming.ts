import path from "node:path";
import type { Item } from "./item.js";

/** Characters in a file name before the extension. */
export const MAX_NAME = 180;

/**
 * A source's title made safe for a file name: NFC, control and separator
 * characters (other than the space) dropped, `/` and `\` → ` and `, `:` → ` -`,
 * the characters no filesystem accepts removed, whitespace collapsed. Ported
 * character-for-character from the Python tool so a re-run against an archive
 * it filled skips instead of re-downloading under a new name.
 */
export function cleanTitle(title: string | null | undefined): string {
  let t = (title ?? "").normalize("NFC");
  // Python: keep a character when it is a space or its Unicode category is not C* or Z*.
  t = [...t].filter((c) => c === " " || !/[\p{C}\p{Z}]/u.test(c)).join("");
  t = t.replace(/\//g, " and ").replace(/\\/g, " and ").replace(/:/g, " -");
  t = t.replace(/[<>"|?*]/g, "");
  t = t.replace(/\s+/g, " ");
  return t.replace(/^[ .-]+|[ .-]+$/g, "");
}

/** Cut a file name (without extension) at a word so it stays under `maxLength`. */
export function safeName(base: string, maxLength = MAX_NAME): string {
  if (base.length <= maxLength) return base;
  const cut = base.slice(0, maxLength);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[ .,-]+$/, "");
}

/**
 * Items whose destination collides (case-insensitively) get the source's own row
 * id in parentheses — never a counter, so the name is stable across runs.
 */
export function dedupeDests(items: Item[], key = "list_id"): void {
  const seen = new Map<string, Item[]>();
  for (const item of items) {
    const k = item.dest.toLowerCase();
    const group = seen.get(k);
    if (group) group.push(item);
    else seen.set(k, [item]);
  }
  for (const group of seen.values()) {
    if (group.length < 2) continue;
    for (const item of group) {
      const ext = path.extname(item.dest);
      const root = item.dest.slice(0, item.dest.length - ext.length);
      item.dest = `${root} (${String(item.extra[key] ?? "")})${ext}`;
    }
  }
}

/** Duplicate destinations that survived deduplication — a plugin bug the runner refuses to run with. */
export function duplicateDests(items: readonly Item[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of items) {
    const k = item.dest.toLowerCase();
    if (seen.has(k)) dupes.add(item.dest);
    seen.add(k);
  }
  return [...dupes];
}
