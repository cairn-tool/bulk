import fs from "node:fs";
import path from "node:path";

/**
 * Writes one file atomically: staged beside the destination with `wx`, then
 * renamed. The `wx` guards the staging file, so two processes cannot stage over
 * each other; the rename still replaces whatever is at the destination.
 */
export function writeAtomically(destination: string, content: string | Uint8Array): void {
  const resolved = path.resolve(destination);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory())
    throw new Error(`Destination is a directory: ${destination}`);
  const staged = `${resolved}.bulk-${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (typeof content === "string")
    fs.writeFileSync(staged, content, { encoding: "utf-8", flag: "wx" });
  else fs.writeFileSync(staged, content, { flag: "wx" });
  try {
    fs.renameSync(staged, resolved);
  } catch (error) {
    fs.rmSync(staged, { force: true });
    throw error;
  }
}
