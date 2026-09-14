import type { BulkPlugin, QueryAnswer, QueryService } from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { recordOf, score, searchText, type NtrsCitation } from "./parse.js";

export const API = "https://ntrs.nasa.gov/api/citations/";

export interface NtrsOptions {
  search?: boolean;
  minScore?: number;
}

export const ntrs: QueryService<NtrsOptions> = {
  normalize: (raw, opts) => {
    const s = raw.trim();
    if (opts.search) return s || null;
    return /^\d{11}$/.test(s) ? s : null;
  },
  async lookup(keys, ctx, opts) {
    const key = keys[0];
    const out: Record<string, QueryAnswer> = {};
    if (opts.search) {
      const params = new URLSearchParams({ q: searchText(key), "page.size": "5" });
      const response = await ctx.http.request({
        url: `${API}search?${params}`,
        accept: "application/json",
        timeoutMs: 60_000,
        signal: ctx.signal,
      });
      if (response.status !== 200) throw new Error(`http ${response.status}`);
      const results = (await response.json<{ results?: NtrsCitation[] }>()).results ?? [];
      let best: { record: Record<string, unknown>; score: number } | undefined;
      for (const hit of results) {
        const s = score(key, hit.title);
        if (s >= (opts.minScore ?? 0.6) && (!best || s > best.score))
          best = { record: recordOf(hit), score: s };
      }
      out[key] = best ? { ...best.record, score: Math.round(best.score * 100) / 100 } : null;
      return out;
    }
    const response = await ctx.http.request({
      url: API + encodeURIComponent(key),
      accept: "application/json",
      timeoutMs: 60_000,
      signal: ctx.signal,
    });
    if (response.status === 404) return { [key]: null };
    if (response.status !== 200) throw new Error(`http ${response.status}`);
    out[key] = recordOf(await response.json<NtrsCitation>());
    return out;
  },
  describe: (r) =>
    `${String(r.title ?? "").slice(0, 70)}${"score" in r ? `  (${String(r.score)})` : ""}`,
};

export const plugin: BulkPlugin = { manifest, query: ntrs as QueryService<never> };
