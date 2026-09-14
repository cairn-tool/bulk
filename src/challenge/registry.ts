import { AnubisSolver } from "./anubis.js";
import type { JarEntry, Solver } from "./solver.js";

export type SolverId = "anubis";

/** Every solver, constructed against one cache directory. */
export function solvers(cacheDir: string): Record<SolverId, Solver> {
  return { anubis: new AnubisSolver(cacheDir) };
}

export function solver(cacheDir: string, id: string): Solver {
  const all = solvers(cacheDir);
  const found = all[id as SolverId];
  if (!found)
    throw new Error(`Unknown challenge solver: ${id}. Known: ${Object.keys(all).join(", ")}`);
  return found;
}

/** Every cached jar across every solver — what `bulk cache list` prints. */
export function allEntries(cacheDir: string): JarEntry[] {
  return Object.values(solvers(cacheDir)).flatMap((s) => s.entries());
}

/** Clear one solver's cache, one host, or everything. Returns the removed (solver, host) pairs. */
export function clearAll(
  cacheDir: string,
  id?: string,
  host?: string,
): { solver: string; host: string }[] {
  const removed: { solver: string; host: string }[] = [];
  for (const s of Object.values(solvers(cacheDir))) {
    if (id && s.name !== id) continue;
    for (const h of s.clear(host)) removed.push({ solver: s.name, host: h });
  }
  return removed;
}
