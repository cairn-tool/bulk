import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { human } from "../../text/bytes.js";
import { manifest } from "./manifest.js";
import { PAGE, iso, itemsFor, parseListing } from "./parse.js";

export interface AvdataOptions {
  only?: string[];
  monthly?: boolean;
}

export const avdata: FetchSystem<AvdataOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const file = ctx.listFile ?? path.join(ctx.dest, manifest.fetch!.catalogueFile);
    if (!ctx.listFile) {
      ctx.log.info(`Fetching the avdata directory -> ${file}`);
      const response = await ctx.http.request({
        url: PAGE,
        accept: "text/html",
        timeoutMs: 120_000,
        signal: ctx.signal,
      });
      const text = await response.text();
      if (response.status !== 200)
        throw new Error(`directory page failed: HTTP ${response.status}`);
      fs.writeFileSync(file, text, "utf-8");
    }
    let rows = parseListing(fs.readFileSync(file, "utf-8"));
    if (!rows.length)
      throw new Error(
        `no files found on the directory page — the layout may have changed; see ${file}`,
      );
    if (opts.only?.length) {
      const want = new Set(opts.only.map((o) => o.toLowerCase()));
      rows = rows.filter((r) => want.has(r.name.toLowerCase()));
    }
    if (opts.monthly) rows = rows.filter((r) => /^up\d\d[A-Z]{3}\.zip$/i.test(r.name));
    const items = itemsFor(rows);
    return {
      items,
      records: rows.map((r) => ({ name: r.name, listed_date: iso(r.listed), bytes: r.bytes })),
      summary: [`${rows.length} files, ${human(rows.reduce((n, r) => n + r.bytes, 0))} listed`],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: avdata as FetchSystem<never> };
