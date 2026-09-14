import { allEntries, clearAll } from "../challenge/registry.js";
import { resolveFormat, type FormatOptions } from "../formatters.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";

function expiry(epoch: number | null): string {
  return epoch ? new Date(epoch * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : "";
}

/** `bulk cache list` — every cached challenge cookie across every solver. */
export async function cacheListAction(opts: FormatOptions): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(opts, rt.config.output.format);
  const entries = allEntries(rt.config.cacheDir).map((e) => ({
    ...e,
    expires: expiry(e.expires) || null,
  }));
  if (format === "json") {
    process.stdout.write(
      jsonPayload("cache list", { cacheDir: rt.config.cacheDir, entries }, opts),
    );
    return;
  }
  if (!entries.length) {
    process.stdout.write(`no cached cookies under ${rt.config.cacheDir}\n`);
    return;
  }
  for (const e of entries)
    process.stdout.write(
      `${e.solver.padEnd(8)} ${e.host.padEnd(28)} ${e.state.padEnd(9)} ${(e.expires ?? "").padEnd(20)} ${e.bytes} bytes  ${e.file}\n`,
    );
}

export interface CacheClearOptions extends FormatOptions {
  solver?: string;
  host?: string;
}

/** `bulk cache clear` — remove cached cookies: all, one solver's, or one host's. */
export async function cacheClearAction(opts: CacheClearOptions): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(opts, rt.config.output.format);
  const removed = clearAll(rt.config.cacheDir, opts.solver, opts.host);
  if (format === "json") {
    process.stdout.write(jsonPayload("cache clear", { removed }, opts));
    return;
  }
  if (!removed.length) process.stdout.write("nothing to clear\n");
  for (const r of removed) process.stdout.write(`cleared ${r.solver} cookie for ${r.host}\n`);
}

/** `bulk cache path` — where the cache lives. */
export async function cachePathAction(opts: FormatOptions): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(opts, rt.config.output.format);
  if (format === "json")
    process.stdout.write(jsonPayload("cache path", { cacheDir: rt.config.cacheDir }, opts));
  else process.stdout.write(rt.config.cacheDir + "\n");
}

export interface CacheLimitsOptions extends FormatOptions {
  all?: boolean;
}

/** `bulk cache limits` — the per-host pacing in force: declared floors and what this process learned. */
export async function cacheLimitsAction(opts: CacheLimitsOptions): Promise<void> {
  const rt = runtime();
  const format = resolveFormat(opts, rt.config.output.format);
  const declared = rt.limiters.declared();
  const states = rt.http.limits();
  const inForce = states.filter((s) => opts.all || s.interval || s.waiting || s.limit);
  if (format === "json") {
    process.stdout.write(jsonPayload("cache limits", { declared, inForce }, opts));
    return;
  }
  const lines: string[] = [];
  if (Object.keys(declared).length) {
    lines.push(
      "declared floors (hosts that publish no rate-limit headers, and limits: in the config)",
    );
    for (const [host, s] of Object.entries(declared).sort())
      lines.push(`  ${host.padEnd(28)} ${s.toFixed(1).padStart(6)}s between requests`);
  }
  lines.push(
    inForce.length
      ? "\nin force this process"
      : "\nnothing learned this process (limits are learned per run)",
  );
  for (const s of inForce) {
    const bits = [`${s.interval.toFixed(2)}s spacing`];
    if (s.limit) bits.push(`${s.limit}/${s.window ?? 1}s advertised`);
    if (s.remaining !== null) bits.push(`${s.remaining} left`);
    if (s.waiting) bits.push(`backing off ${s.waiting}s`);
    lines.push(`  ${s.host.padEnd(28)} ${bits.join(", ")}${s.source ? `  (${s.source})` : ""}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}
