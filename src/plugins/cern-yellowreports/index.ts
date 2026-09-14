import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { OAI, itemsFor, parsePage, type YellowRecord } from "./parse.js";

export interface YellowOptions {
  report?: string[];
  from?: string;
  until?: string;
}

async function listRecords(ctx: FetchContext, opts: YellowOptions): Promise<YellowRecord[]> {
  const dir = path.join(ctx.dest, "_oai");
  fs.mkdirSync(dir, { recursive: true });
  let params = new URLSearchParams({ verb: "ListRecords", metadataPrefix: "oai_dc" });
  if (opts.from) params.set("from", opts.from);
  if (opts.until) params.set("until", opts.until);
  const records: YellowRecord[] = [];
  let page = 0;
  for (;;) {
    page++;
    let xml: string;
    if (ctx.listFile && page === 1) xml = fs.readFileSync(ctx.listFile, "utf-8");
    else {
      const response = await ctx.http.request({
        url: `${OAI}?${params}`,
        accept: "application/xml",
        timeoutMs: 120_000,
        signal: ctx.signal,
      });
      xml = await response.text();
      if (response.status !== 200) throw new Error(`OAI ListRecords: HTTP ${response.status}`);
      fs.writeFileSync(path.join(dir, `page${page}.xml`), xml, "utf-8");
    }
    const { records: got, token, total } = parsePage(xml);
    records.push(...got);
    ctx.log.info(`  ${records.length} records${total ? ` (of ${total})` : ""}`);
    if (!token || ctx.listFile) break;
    params = new URLSearchParams({ verb: "ListRecords", resumptionToken: token });
    await ctx.sleep(Math.min(ctx.delay, 2));
  }
  return records;
}

export const yellowreports: FetchSystem<YellowOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    let records = await listRecords(ctx, opts);
    if (opts.report?.length) {
      const want = new Set(opts.report.map((r) => r.toUpperCase()));
      records = records.filter((r) => want.has(r.report_number.toUpperCase()));
    }
    const items = itemsFor(records);
    const reports = new Set(items.map((it) => String(it.extra.report_number)));
    return {
      items,
      summary: [
        `${records.length} records, ${items.length} article PDFs across ${reports.size} report(s)`,
      ],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: yellowreports as FetchSystem<never> };
