import path from "node:path";
import { writeTsv, type Row } from "../text/tsv.js";
import type { Item } from "./item.js";

export const MANIFEST_NAME = "_manifest.tsv";

/** The manifest row for an item: its `extra` with `dest`, `url` and `bytes` always filled from the item itself. */
export function manifestRow(item: Item): Row {
  return {
    ...item.extra,
    dest: item.dest,
    url: item.url,
    bytes: item.bytes ?? item.extra.bytes ?? 0,
  };
}

/** `_manifest.tsv` — one row per item, written before the first download. */
export function writeManifest(
  dest: string,
  items: readonly Item[],
  columns: readonly string[],
): string {
  const file = path.join(dest, MANIFEST_NAME);
  writeTsv(file, items.map(manifestRow), columns);
  return file;
}
