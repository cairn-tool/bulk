import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { INDEX_URL, itemsFor, parseIndex, presentNumbers } from "./parse.js";

export interface RfcOptions {
  from?: number;
  to?: number;
  missingFrom?: string;
}

function walkNames(folder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
      else out.push(entry.name);
    }
  };
  if (fs.existsSync(folder)) walk(folder);
  return out;
}

export const rfc: FetchSystem<RfcOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const file = ctx.listFile ?? path.join(ctx.dest, manifest.fetch!.catalogueFile);
    if (!ctx.listFile) {
      ctx.log.info(`Fetching rfc-index.xml -> ${file}`);
      const response = await ctx.http.request({
        url: INDEX_URL,
        accept: "application/xml",
        timeoutMs: 300_000,
        signal: ctx.signal,
      });
      const text = await response.text();
      if (response.status !== 200 || text.length < 1000)
        throw new Error(`rfc-index.xml: HTTP ${response.status}, ${text.length} bytes`);
      fs.writeFileSync(file, text, "utf-8");
    }
    const rows = parseIndex(fs.readFileSync(file, "utf-8"));
    let selected = rows.filter(
      (r) => (!opts.from || r.number >= opts.from) && (!opts.to || r.number <= opts.to),
    );
    const summary = [`${rows.length} RFCs in the index; ${selected.length} selected`];
    if (opts.missingFrom) {
      const have = presentNumbers(walkNames(opts.missingFrom));
      selected = selected.filter((r) => !have.has(r.number));
      summary.push(
        `${have.size} RFC numbers present under ${opts.missingFrom}; ${selected.length} to take`,
      );
    }
    return {
      items: itemsFor(selected),
      records: selected as unknown as Record<string, unknown>[],
      summary,
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: rfc as FetchSystem<never> };
