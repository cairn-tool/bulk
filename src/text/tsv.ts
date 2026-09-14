import fs from "node:fs";
import path from "node:path";

export type Row = Record<string, unknown>;

/**
 * A cell is one line: tabs, carriage returns and newlines become a space.
 * The Python tool wrote titles straight in; a manifest is a record of a pull, not
 * a lossless store, so the trade is documented in docs/formats/manifest.md.
 */
export function cell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = Array.isArray(value) ? value.map(String).join(", ") : String(value);
  return text.replace(/[\t\r\n]+/g, " ");
}

export function formatTsv(rows: readonly Row[], columns: readonly string[]): string {
  const lines = [columns.join("\t")];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join("\t"));
  return lines.join("\n") + "\n";
}

export function writeTsv(file: string, rows: readonly Row[], columns: readonly string[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatTsv(rows, columns), "utf-8");
}

/** Reads a TSV with a header row into records. */
export function parseTsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (!lines.length) return [];
  const columns = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const parts = line.split("\t");
    const row: Record<string, string> = {};
    columns.forEach((c, i) => (row[c] = parts[i] ?? ""));
    return row;
  });
}
