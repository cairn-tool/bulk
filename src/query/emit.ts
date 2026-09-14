import { writeTsv, type Row } from "../text/tsv.js";
import { isFound, type QueryResults } from "./resolve.js";
import type { QueryRecord } from "./cache.js";

export interface ListColumn {
  key: string;
  header?: string;
  /** Maximum width in the text table; cells are cut to it. */
  width?: number;
  align?: "left" | "right";
  /** Computes the cell from the key and record; defaults to `record[key]`. */
  value?: (key: string, record: QueryRecord) => unknown;
}

export const CELL_MAX = 60;

export function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}

/** The table rows for a set of query results: the key column always filled, the rest from the record. */
export function queryRows(results: QueryResults, columns: readonly ListColumn[]): Row[] {
  const rows: Row[] = [];
  for (const [key, result] of Object.entries(results)) {
    const row: Row = {};
    columns.forEach((column, index) => {
      if (!isFound(result)) {
        row[column.key] = index === 0 ? key : "";
        return;
      }
      try {
        const record = result as QueryRecord;
        const value = column.value
          ? column.value(key, record)
          : index === 0
            ? key
            : record[column.key];
        row[column.key] = cellText(value);
      } catch {
        row[column.key] = "";
      }
    });
    rows.push(row);
  }
  return rows;
}

/** A fixed-width text table, cells capped at `CELL_MAX` (or the column's own width). */
export function renderTable(rows: readonly Row[], columns: readonly ListColumn[]): string {
  const widths = columns.map((column) => {
    const header = column.header ?? column.key;
    const max = Math.max(header.length, ...rows.map((r) => cellText(r[column.key]).length));
    return Math.min(max, column.width ?? CELL_MAX);
  });
  const line = (cells: string[]): string =>
    cells
      .map((c, i) => {
        const text = c.slice(0, widths[i]);
        return columns[i].align === "right" ? text.padStart(widths[i]) : text.padEnd(widths[i]);
      })
      .join("  ")
      .trimEnd();
  const lines = [line(columns.map((c) => c.header ?? c.key))];
  for (const row of rows) lines.push(line(columns.map((c) => cellText(row[c.key]))));
  return lines.join("\n") + "\n";
}

export function writeRowsTsv(
  file: string,
  rows: readonly Row[],
  columns: readonly ListColumn[],
): void {
  writeTsv(
    file,
    rows,
    columns.map((c) => c.key),
  );
}

export function foundCount(results: QueryResults): number {
  return Object.values(results).filter(isFound).length;
}
