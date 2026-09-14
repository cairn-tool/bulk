import fs from "node:fs";
import path from "node:path";
import { CDX_FIELDS, cdx, snapshotUrl, type CdxRow } from "../../clients/ia.js";
import type { BulkPlugin, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { byteCompare } from "../../text/bytes.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";

export interface WaybackOptions {
  url?: string[];
  urlsFrom?: string;
  match?: "exact" | "prefix" | "host" | "domain";
  mimetype?: string;
  status?: string;
  since?: string;
  until?: string;
  allCaptures?: boolean;
  cdxLimit?: number;
}

const EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/html": ".html",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "application/postscript": ".ps",
  "application/msword": ".doc",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

/** `<host>/<path with slashes flattened>[ (timestamp)].<ext>` from a CDX row. */
export function nameFor(row: CdxRow, withTimestamp: boolean): { host: string; name: string } {
  let u: URL;
  try {
    u = new URL(row.original);
  } catch {
    u = new URL(`http://unknown/${row.original}`);
  }
  const host = (u.hostname || "unknown").split(":")[0];
  let p = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, "") || "index";
  if (u.search) p += "-" + decodeURIComponent(u.search.slice(1));
  const dot = p.lastIndexOf(".");
  const slash = p.lastIndexOf("/");
  let stem = dot > slash ? p.slice(0, dot) : p;
  let ext = dot > slash ? p.slice(dot) : "";
  if (!ext) ext = EXT[row.mimetype ?? ""] ?? "";
  stem = safeName(cleanTitle(stem.replace(/\//g, " - ")), 150) || "document";
  if (withTimestamp) stem += ` (${row.timestamp})`;
  return { host, name: stem + ext };
}

/** One item per URL (the newest capture), or per distinct capture with --all-captures. */
export function itemsFor(rows: readonly CdxRow[], allCaptures: boolean): Item[] {
  let selected = [...rows];
  if (!allCaptures) {
    const newest = new Map<string, CdxRow>();
    for (const r of rows) {
      const current = newest.get(r.original);
      if (!current || r.timestamp > current.timestamp) newest.set(r.original, r);
    }
    selected = [...newest.values()];
  }
  selected.sort(
    (a, b) => byteCompare(a.original, b.original) || byteCompare(a.timestamp, b.timestamp),
  );
  const items: Item[] = selected.map((r) => {
    const { host, name } = nameFor(r, allCaptures);
    return {
      dest: `${host}/${name}`,
      url: snapshotUrl(r.timestamp, r.original),
      extra: {
        original: r.original,
        timestamp: r.timestamp,
        mimetype: r.mimetype ?? "",
        statuscode: r.statuscode ?? "",
        digest: r.digest ?? "",
        length: r.length ?? "",
        host,
        list_id: r.timestamp,
      },
    };
  });
  dedupeDests(items);
  return items;
}

export const wayback: FetchSystem<WaybackOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const urls = [...(opts.url ?? [])];
    if (opts.urlsFrom)
      for (const line of fs.readFileSync(opts.urlsFrom, "utf-8").split(/\r?\n/)) {
        const t = line.trim();
        if (t && !t.startsWith("#")) urls.push(t);
      }
    const unique = [...new Set(urls)];
    if (!unique.length) throw new Error("give --url or --urls-from FILE");
    let rows: CdxRow[] = [];
    if (ctx.listFile) rows = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as CdxRow[];
    else {
      for (let i = 0; i < unique.length; i++) {
        const u = unique[i];
        try {
          const got = await cdx(ctx.http, u, {
            match: opts.match,
            mimetype: opts.mimetype,
            statuscode: opts.status ?? "200",
            limit: opts.cdxLimit,
            since: opts.since,
            until: opts.until,
            signal: ctx.signal,
            sleep: ctx.sleep,
          });
          ctx.log.info(`  ${u}: ${got.length} capture(s)`);
          rows.push(...got);
        } catch (error) {
          ctx.log.info(`  ${u}: ${(error as Error).message}`);
        }
        if (i < unique.length - 1 && ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
      }
      fs.writeFileSync(
        path.join(ctx.dest, manifest.fetch!.catalogueFile),
        JSON.stringify(rows),
        "utf-8",
      );
    }
    if (!rows.length) return { items: [], summary: [], warnings: ["no captures matched"] };
    writeTsv(path.join(ctx.dest, "_cdx.tsv"), rows, CDX_FIELDS);
    const items = itemsFor(rows, Boolean(opts.allCaptures));
    return { items, summary: [`${rows.length} captures, ${items.length} to take`] };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: wayback as FetchSystem<never> };
