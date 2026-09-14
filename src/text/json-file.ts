import fs from "node:fs";
import path from "node:path";

export function loadJson<T = unknown>(file: string | undefined, fallback: T): T {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

/** Written to a sibling temp file and renamed, so an interrupted write leaves the old file intact. */
export function saveJson(file: string, value: unknown, indent: number | undefined = 0): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, indent), "utf-8");
  fs.renameSync(tmp, file);
}
