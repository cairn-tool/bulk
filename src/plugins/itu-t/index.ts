import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem } from "../../plugin/types.js";
import { loadJson, saveJson } from "../../text/json-file.js";
import { manifest } from "./manifest.js";
import { API, HELD, itemsFor, type ItuTRecord } from "./parse.js";

export interface ItuTOptions {
  series?: string[];
  approvedFrom?: string;
  approvedTo?: string;
  mainOnly?: boolean;
}

async function fetchSeries(
  ctx: FetchContext,
  series: string[],
  opts: ItuTOptions,
): Promise<Record<string, ItuTRecord[]>> {
  const file = ctx.listFile ?? path.join(ctx.dest, manifest.fetch!.catalogueFile);
  const data: Record<string, ItuTRecord[]> = ctx.listFile ? loadJson(file, {}) : {};
  if (!ctx.listFile) {
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const params = new URLSearchParams({
        query: "",
        series: s,
        main_edition_flag: opts.mainOnly ? "true" : "false",
        approved_from: opts.approvedFrom ?? "2023-01-01",
        approved_to: opts.approvedTo ?? "2030-12-31",
        rows: "5000",
        page: "1",
      });
      const response = await ctx.http.request({
        url: `${API}?${params}`,
        accept: "application/json",
        timeoutMs: 120_000,
        signal: ctx.signal,
      });
      if (response.status !== 200) throw new Error(`series ${s}: HTTP ${response.status}`);
      const d = await response.json<{ Data?: ItuTRecord[]; Total?: number }>();
      data[s] = d.Data ?? [];
      ctx.log.info(`  series ${s}: ${data[s].length} of ${d.Total ?? "?"}`);
      if (i < series.length - 1) await ctx.sleep(Math.min(ctx.delay, 5));
    }
    saveJson(file, data);
  }
  return Object.fromEntries(series.map((s) => [s, data[s] ?? []]));
}

export const itut: FetchSystem<ItuTOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const series = (opts.series?.length ? opts.series : HELD).map((s) => s.toUpperCase());
    ctx.log.info(
      `ITU-T catalogue, ${series.length} series, approved ${opts.approvedFrom ?? "2023-01-01"} .. ${opts.approvedTo ?? "2030-12-31"}`,
    );
    const bySeries = await fetchSeries(ctx, series, opts);
    const items = itemsFor(bySeries);
    fs.mkdirSync(ctx.dest, { recursive: true });
    return { items, summary: [`${items.length} texts`] };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: itut as FetchSystem<never> };
