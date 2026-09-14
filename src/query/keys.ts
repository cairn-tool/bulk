import fs from "node:fs";

/** Keys from the command line and `--from FILE` (one per line, `#` comments), deduplicated in order. */
export function readKeys(argv: readonly string[], fromFile?: string): string[] {
  const keys = [...argv];
  if (fromFile) {
    const text = fs.readFileSync(fromFile, "utf-8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line && !line.startsWith("#")) keys.push(line);
    }
  }
  return [...new Set(keys)];
}
