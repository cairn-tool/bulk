import { fetchWork, searchWorks, workRecord } from "../../clients/crossref.js";
import type {
  BulkPlugin,
  ListColumn,
  QueryAnswer,
  QueryRecord,
  QueryService,
} from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { normalizeDoi } from "./parse.js";

export interface DoiOptions {
  search?: boolean;
  rows?: number;
  links?: boolean;
}

const SEARCH_COLUMNS: readonly ListColumn[] = [
  { key: "query", width: 40 },
  { key: "total", align: "right", width: 8 },
  { key: "doi", width: 40 },
  { key: "issued", width: 10 },
  { key: "title" },
];

interface Hit {
  doi: string;
  issued: string;
  title: string;
  authors: string[];
  container: string;
}

export const doi: QueryService<DoiOptions> = {
  normalize: (raw, opts) => (opts.search ? raw.trim() || null : normalizeDoi(raw)),
  async lookup(keys, ctx, opts) {
    const key = keys[0];
    if (opts.search) {
      const { items, total } = await searchWorks(ctx.http, key, opts.rows ?? 5, ctx.signal);
      const hits = items.map(workRecord) as unknown as Hit[];
      const out: Record<string, QueryAnswer> = {};
      out[key] = hits.length ? { query: key, total, hits, ...hits[0] } : null;
      return out;
    }
    const work = await fetchWork(ctx.http, key, ctx.signal);
    return { [key]: work ? workRecord(work) : null };
  },
  describe: (r) =>
    "hits" in r
      ? `${Number(r.total)} match(es); best ${String(r.doi)}`
      : `${String(r.title ?? "").slice(0, 52)}  (${String(r.issued ?? "").slice(0, 4)}, ${String(r.type ?? "")})`,
  columns: (opts) => (opts.search ? SEARCH_COLUMNS : manifest.query!.columns),
  details(key, record: QueryRecord, opts) {
    if (opts.search) {
      const hits = (record.hits as Hit[]) ?? [];
      return hits.map((h) => {
        const who = h.authors.slice(0, 2).join(", ") + (h.authors.length > 2 ? " et al." : "");
        return `${h.doi.padEnd(40)} ${h.issued.slice(0, 10).padEnd(11)} ${h.title.slice(0, 58)}${who || h.container ? `\n  ${"".padEnd(40)} ${who.slice(0, 40).padEnd(40)} ${h.container.slice(0, 40)}` : ""}`;
      });
    }
    if (opts.links) {
      const links = (record.links as { url: string; type: string; version: string }[]) ?? [];
      if (!links.length) return ["(no full-text links registered)"];
      return links.map((l) => `${l.type.slice(0, 24).padEnd(24)} ${l.version.padEnd(12)} ${l.url}`);
    }
    return undefined;
  },
};

export const plugin: BulkPlugin = { manifest, query: doi as QueryService<never> };
