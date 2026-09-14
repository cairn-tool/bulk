import fs from "node:fs";
import path from "node:path";
import { cell } from "../text/tsv.js";

export const LOG_COLUMNS = [
  "when",
  "status",
  "dest",
  "bytes_expected",
  "bytes_got",
  "sha256",
  "seconds",
  "http",
  "note",
] as const;

export const DEFAULT_LOG_NAME = "_download-log.tsv";

function stamp(date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

/** Appends one row per transfer; writes the header only when the file is new. */
export class TransferLog {
  private readonly fd: number;

  constructor(readonly file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const isNew = !fs.existsSync(file);
    this.fd = fs.openSync(file, "a");
    if (isNew) fs.writeSync(this.fd, LOG_COLUMNS.join("\t") + "\n");
  }

  write(row: {
    status: string;
    dest: string;
    expected: number;
    got: number;
    sha256: string;
    seconds: number;
    http: number;
    note: string;
  }): void {
    const line = [
      stamp(),
      row.status,
      cell(row.dest),
      String(row.expected),
      String(row.got),
      row.sha256,
      row.seconds.toFixed(1),
      String(row.http),
      cell(row.note),
    ].join("\t");
    fs.writeSync(this.fd, line + "\n");
  }

  close(): void {
    fs.closeSync(this.fd);
  }
}
