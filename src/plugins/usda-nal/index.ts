import type { BulkPlugin, QueryAnswer, QueryService } from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { NAL_API, recordOf, searchParams, type PnxDoc } from "./parse.js";

export interface NalOptions {
  field?: string;
  scope?: string;
  rows?: number;
}

export const query: QueryService<NalOptions> = {
  normalize: (raw) => raw.trim() || null,
  async lookup(keys, ctx, opts) {
    const key = keys[0];
    const params = searchParams(
      key,
      opts.field ?? "any",
      opts.scope ?? "MyInstitution",
      opts.rows ?? 5,
    );
    const response = await ctx.http.request({
      url: `${NAL_API}?${params}`,
      accept: "application/json",
      timeoutMs: 90_000,
      signal: ctx.signal,
    });
    if (response.status !== 200) throw new Error(`http ${response.status}`);
    const got = await response.json<{ info?: { total?: number }; docs?: PnxDoc[] }>();
    const hits = (got.docs ?? []).map(recordOf);
    const out: Record<string, QueryAnswer> = {};
    out[key] = hits.length
      ? { ...hits[0], matches: hits, total: got.info?.total ?? hits.length }
      : null;
    return out;
  },
  describe: (r) =>
    `${String(r.title ?? "").slice(0, 52)}  (${String(r.date ?? "").slice(0, 4)}, of ${String(r.total)})`,
};

export const plugin: BulkPlugin = { manifest, query: query as QueryService<never> };
