import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { human } from "../../text/bytes.js";
import { manifest } from "./manifest.js";
import {
  API,
  dateFilter,
  equals,
  itemsFor,
  searchBody,
  type AdamsDoc,
  type AdamsFilter,
} from "./parse.js";

export interface AdamsOptions {
  ml?: string[];
  mlFrom?: string;
  q?: string;
  docket?: string[];
  type?: string[];
  added?: string[];
  dated?: string[];
  packages?: boolean;
}

async function search(ctx: FetchContext, q: string, filters: AdamsFilter[]): Promise<AdamsDoc[]> {
  const docs: AdamsDoc[] = [];
  let skip = 0;
  let total: number | undefined;
  while (total === undefined || skip < total) {
    const response = await ctx.http.request({
      url: API,
      method: "POST",
      body: searchBody(q, filters, skip),
      headers: { "content-type": "application/json" },
      accept: "application/json",
      timeoutMs: 300_000,
      signal: ctx.signal,
    });
    if (response.status !== 200) throw new Error(`search: HTTP ${response.status} (skip ${skip})`);
    const d = await response.json<{
      count?: number;
      results?: { document: AdamsDoc }[];
      errors?: unknown;
    }>();
    if (d.errors) throw new Error(`search: ${JSON.stringify(d.errors)}`);
    total = Number(d.count ?? 0);
    const page = (d.results ?? []).map((r) => r.document);
    docs.push(...page);
    ctx.log.info(`  ${docs.length} of ${total}`);
    if (!page.length) break;
    skip += page.length;
    if (skip < total) await ctx.sleep(Math.min(ctx.delay, 2));
  }
  return docs;
}

export const adams: FetchSystem<AdamsOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const mls = [...(opts.ml ?? [])];
    if (opts.mlFrom)
      for (const line of fs.readFileSync(opts.mlFrom, "utf-8").split(/\r?\n/)) {
        const t = line.trim();
        if (t && !t.startsWith("#")) mls.push(t);
      }
    const searching = Boolean(
      opts.q || opts.docket?.length || opts.type?.length || opts.added || opts.dated,
    );
    if (!mls.length && !searching && !ctx.listFile)
      throw new Error(
        "nothing selected: give --ml / --ml-from, or a search (--q, --docket, --type, --added, --dated)",
      );
    let docs: AdamsDoc[] = [];
    if (ctx.listFile) docs = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as AdamsDoc[];
    else {
      const unique = [...new Set(mls.map((m) => m.toUpperCase()))];
      for (let i = 0; i < unique.length; i++) {
        const got = await search(ctx, "", [equals("AccessionNumber", unique[i])]);
        if (!got.length) ctx.log.info(`  ${unique[i]}: not found`);
        docs.push(...got);
        if (i < unique.length - 1) await ctx.sleep(Math.min(ctx.delay, 2));
      }
      if (searching) {
        const filters: AdamsFilter[] = [];
        for (const dk of opts.docket ?? []) filters.push(equals("DocketNumber", dk));
        for (const t of opts.type ?? []) filters.push(equals("DocumentType", t));
        if (opts.added) filters.push(dateFilter("DateAdded", opts.added[0], opts.added[1]));
        if (opts.dated) filters.push(dateFilter("DocumentDate", opts.dated[0], opts.dated[1]));
        docs.push(...(await search(ctx, opts.q ?? "", filters)));
      }
      if (opts.packages) {
        const have = new Set(docs.map((d) => d.AccessionNumber));
        const packages = docs
          .filter((d) => d.IsPackage === "Yes")
          .map((d) => d.AccessionNumber ?? "");
        for (let i = 0; i < packages.length; i++) {
          const members = await search(ctx, "", [equals("PackagesFiledIn", packages[i])]);
          const fresh = members.filter((m) => !have.has(m.AccessionNumber));
          for (const m of fresh) have.add(m.AccessionNumber);
          docs.push(...fresh);
          ctx.log.info(`  package ${packages[i]}: ${members.length} members, ${fresh.length} new`);
          if (i < packages.length - 1) await ctx.sleep(Math.min(ctx.delay, 2));
        }
      }
      // A document named by accession and matched by a search is one document.
      const seen = new Set<string>();
      docs = docs.filter((d) => {
        const acc = d.AccessionNumber ?? "";
        if (seen.has(acc)) return false;
        seen.add(acc);
        return true;
      });
      fs.writeFileSync(
        path.join(ctx.dest, manifest.fetch!.catalogueFile),
        JSON.stringify(docs),
        "utf-8",
      );
    }
    const items = itemsFor(docs);
    const packageCount = docs.filter((d) => d.IsPackage === "Yes").length;
    const listed = items.reduce((n, it) => n + (Number(it.extra.listed_bytes ?? 0) || 0), 0);
    return {
      items,
      summary: [
        `${docs.length} records, ${packageCount} packages (no file), ${items.length} files, about ${human(listed)}`,
      ],
      warnings: docs.length ? [] : ["nothing matched"],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: adams as FetchSystem<never> };
