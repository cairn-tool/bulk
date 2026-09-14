import fs from "node:fs";
import path from "node:path";
import {
  advanced,
  filesOf,
  first,
  itemRecord,
  metadata,
  search,
  type IaMetadata,
} from "../../clients/ia.js";
import type {
  BulkPlugin,
  FetchContext,
  FetchPlan,
  FetchSystem,
  Item,
  ListColumn,
  QueryAnswer,
  QueryRecord,
  QueryService,
} from "../../plugin/types.js";
import { dedupeDests, safeName } from "../../pull/naming.js";
import { human } from "../../text/bytes.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";

export interface ItemsOptions {
  query?: string;
  collection?: string[];
  identifier?: string[];
  fileFormat?: string[];
  suffix?: string[];
  originalsOnly?: boolean;
  allFiles?: boolean;
}

/** A folder name from a query: keep the values, drop the field names and operators. */
export function labelOf(opts: ItemsOptions): string {
  if (opts.identifier?.length) return "identifiers";
  if (opts.collection?.length) return safeName(opts.collection.join("-"), 60);
  const label = (opts.query ?? "")
    .replace(/\b(AND|OR|NOT)\b/g, " ")
    .replace(/\w+:/g, "")
    .replace(/[^\w.\- ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join("-");
  return safeName(label, 60) || "query";
}

async function selectIdentifiers(ctx: FetchContext, opts: ItemsOptions): Promise<string[]> {
  if (opts.identifier?.length) return [...new Set(opts.identifier)];
  const q = opts.collection?.length
    ? opts.collection.map((c) => `collection:${c}`).join(" OR ")
    : (opts.query ?? "");
  const { items } = await search(ctx.http, q, {
    limit: ctx.limit,
    delay: Math.min(ctx.delay, 2),
    sleep: ctx.sleep,
    log: (m) => ctx.log.info(m),
    signal: ctx.signal,
  });
  return items.map((r) => first(r.identifier)).filter(Boolean);
}

export const items: FetchSystem<ItemsOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!(opts.query || opts.collection?.length || opts.identifier?.length))
      throw new Error("select items with --query, --collection or --identifier");
    let identifiers: string[];
    if (ctx.listFile) identifiers = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as string[];
    else {
      identifiers = await selectIdentifiers(ctx, opts);
      fs.writeFileSync(
        path.join(ctx.dest, manifest.fetch!.catalogueFile),
        JSON.stringify(identifiers),
        "utf-8",
      );
    }
    if (!identifiers.length) return { items: [], summary: [], warnings: ["no items matched"] };
    ctx.log.info(`${identifiers.length} items; reading their metadata`);
    const folder = labelOf(opts);
    const metaDir = path.join(ctx.dest, "_metadata");
    fs.mkdirSync(metaDir, { recursive: true });
    const out: Item[] = [];
    const records: Record<string, unknown>[] = [];
    const formats = opts.fileFormat?.length ? new Set(opts.fileFormat) : undefined;
    for (let i = 0; i < identifiers.length; i++) {
      const ident = identifiers[i];
      let meta: IaMetadata | null;
      try {
        meta = await metadata(ctx.http, ident, ctx.signal);
      } catch (error) {
        ctx.log.info(`  ${ident}: ${(error as Error).message}`);
        continue;
      }
      if (!meta) {
        ctx.log.info(`  ${ident}: no such item`);
        continue;
      }
      fs.writeFileSync(path.join(metaDir, `${ident}.json`), JSON.stringify(meta), "utf-8");
      const rec = itemRecord(meta);
      records.push(rec);
      for (const f of filesOf(meta, {
        formats,
        suffixes: opts.suffix,
        originalsOnly: opts.originalsOnly,
        skipDerivatives: !opts.allFiles,
      })) {
        out.push({
          dest: `${folder}/${ident}/${f.name}`,
          url: f.url,
          bytes: f.size,
          digest: f.sha1 ? { algorithm: "sha1", value: f.sha1 } : undefined,
          extra: {
            identifier: ident,
            file: f.name,
            format: f.format,
            bytes: f.size,
            sha1: f.sha1,
            md5: f.md5,
            source: f.source,
            title: String(rec.title),
            creator: String(rec.creator),
            date: String(rec.date),
            mediatype: String(rec.mediatype),
            collection: String(rec.collection),
            list_id: `${ident}/${f.name}`,
          },
        });
      }
      if ((i + 1) % 25 === 0) ctx.log.info(`  ${i + 1}/${identifiers.length} items read`);
      if (i < identifiers.length - 1 && ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 1));
    }
    dedupeDests(out);
    writeTsv(path.join(ctx.dest, "_items.tsv"), records, [
      "identifier",
      "title",
      "creator",
      "date",
      "mediatype",
      "collection",
      "files",
      "bytes",
      "url",
    ]);
    return {
      items: out,
      summary: [`${out.length} files, ${human(out.reduce((n, it) => n + (it.bytes ?? 0), 0))}`],
    };
  },
};

export interface ArchiveQueryOptions {
  search?: boolean;
  rows?: number;
  files?: boolean;
}

const SEARCH_COLUMNS: readonly ListColumn[] = [
  { key: "query", width: 40 },
  { key: "total", align: "right", width: 8 },
  { key: "shown", align: "right", width: 5 },
];

export const query: QueryService<ArchiveQueryOptions> = {
  normalize: (raw) => raw.trim() || null,
  async lookup(keys, ctx, opts) {
    const key = keys[0];
    const out: Record<string, QueryAnswer> = {};
    if (opts.search) {
      const { docs, numFound } = await advanced(ctx.http, key, {
        rows: opts.rows ?? 50,
        signal: ctx.signal,
      });
      const hits = docs.map((d) => ({
        identifier: first(d.identifier),
        title: first(d.title).slice(0, 70),
        date: (first(d.date) || first(d.year)).slice(0, 10),
      }));
      out[key] = hits.length ? { query: key, total: numFound, shown: hits.length, hits } : null;
      return out;
    }
    const meta = await metadata(ctx.http, key, ctx.signal);
    if (!meta) return { [key]: null };
    const rec = itemRecord(meta);
    rec.file_list = filesOf(meta, { skipDerivatives: false });
    return { [key]: rec };
  },
  describe: (r) =>
    "hits" in r
      ? `${Number(r.total)} item(s)`
      : `${String(r.title ?? "").slice(0, 56)}  [${String(r.files)} files, ${human(Number(r.bytes ?? 0))}]`,
  columns: (opts) =>
    opts.search
      ? SEARCH_COLUMNS
      : manifest.query!.columns.map((c) =>
          c.key === "size"
            ? { ...c, value: (_k: string, r: QueryRecord) => human(Number(r.bytes ?? 0)) }
            : c,
        ),
  details(_key, record, opts) {
    if (opts.search)
      return ((record.hits as { identifier: string; date: string; title: string }[]) ?? []).map(
        (h) => `${h.identifier.padEnd(44)} ${h.date.padEnd(11)} ${h.title}`,
      );
    if (opts.files)
      return (
        (record.file_list as { format: string; size: number; sha1: string; name: string }[]) ?? []
      ).map(
        (f) =>
          `${f.format.slice(0, 22).padEnd(22)} ${human(f.size).padStart(9)}  ${f.sha1.slice(0, 12).padEnd(12)}  ${f.name}`,
      );
    return undefined;
  },
};

export const plugin: BulkPlugin = {
  manifest,
  fetch: items as FetchSystem<never>,
  query: query as QueryService<never>,
};
