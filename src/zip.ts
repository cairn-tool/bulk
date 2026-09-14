import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";

export interface UnzipOptions {
  /** Maps an entry name to its destination file name, or null to skip it. */
  rename?: (entry: string) => string | null;
  /** Skip entries whose destination exists at the same size. */
  skipPresent?: boolean;
}

/** Extracts a zip into `dir`. Returns the number of files written. */
export function unzipTo(zipFile: string, dir: string, opts: UnzipOptions = {}): number {
  const entries = unzipSync(new Uint8Array(fs.readFileSync(zipFile)));
  let written = 0;
  for (const [entry, bytes] of Object.entries(entries)) {
    if (entry.endsWith("/")) continue;
    const name = opts.rename ? opts.rename(entry) : path.basename(entry);
    if (name === null) continue;
    const target = path.join(dir, path.basename(name));
    if (opts.skipPresent && fs.existsSync(target) && fs.statSync(target).size === bytes.length)
      continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    written++;
  }
  return written;
}

export function isZip(file: string): boolean {
  try {
    const fd = fs.openSync(file, "r");
    const head = Buffer.alloc(4);
    fs.readSync(fd, head, 0, 4, 0);
    fs.closeSync(fd);
    return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  } catch {
    return false;
  }
}
