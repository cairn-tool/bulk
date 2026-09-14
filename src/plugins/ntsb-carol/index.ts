import fs from "node:fs";
import path from "node:path";
import type {
  BulkPlugin,
  FetchContext,
  FetchPlan,
  FetchSystem,
  Item,
  RunOutcome,
} from "../../plugin/types.js";
import { isZip, unzipTo } from "../../zip.js";
import { manifest } from "./manifest.js";
import {
  API,
  CAP,
  FIRST_YEAR,
  buildQuery,
  exportItems,
  lastDay,
  reportItems,
  tagOf,
  type Period,
  type Template,
} from "./parse.js";

export interface CarolOptions {
  year?: number[];
  fromYear?: number;
  toYear?: number;
  export?: "data" | "summary" | "both";
  reports?: boolean;
  refresh?: boolean;
}

const JSON_HEADERS = { "content-type": "application/json", accept: "application/json" };

async function postJson<T>(ctx: FetchContext, url: string, body: unknown): Promise<T> {
  const response = await ctx.http.request({
    url,
    method: "POST",
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    timeoutMs: 300_000,
    signal: ctx.signal,
  });
  if (response.status !== 200)
    throw new Error(`http ${response.status} from ${url.split("/").pop()}`);
  return response.json<T>();
}

async function session(ctx: FetchContext): Promise<number> {
  const response = await ctx.http.request({
    url: `${API}/Session/CreateSession`,
    method: "POST",
    body: "",
    headers: JSON_HEADERS,
    timeoutMs: 60_000,
    signal: ctx.signal,
  });
  if (response.status !== 200) throw new Error(`CreateSession: HTTP ${response.status}`);
  return Number((await response.text()).trim());
}

async function template(ctx: FetchContext): Promise<Template> {
  const response = await ctx.http.request({
    url: `${API}/Query/BasicSearchTemplate`,
    accept: "application/json",
    timeoutMs: 60_000,
    signal: ctx.signal,
  });
  if (response.status !== 200) throw new Error(`BasicSearchTemplate: HTTP ${response.status}`);
  return response.json<Template>();
}

async function count(
  ctx: FetchContext,
  tpl: Template,
  sid: number,
  start: string,
  end: string,
): Promise<number> {
  const d = await postJson<{ ResultListCount?: number }>(
    ctx,
    `${API}/Query/Main`,
    buildQuery(tpl, sid, start, end),
  );
  return Number(d.ResultListCount ?? 0);
}

/** A year whole, or by month when it exceeds the export cap. */
async function periods(
  ctx: FetchContext,
  tpl: Template,
  sid: number,
  years: number[],
): Promise<Period[]> {
  const out: Period[] = [];
  for (let i = 0; i < years.length; i++) {
    const y = years[i];
    const n = await count(ctx, tpl, sid, `${y}-01-01`, `${y}-12-31`);
    if (n <= CAP) out.push({ year: y, month: 0, start: `${y}-01-01`, end: `${y}-12-31`, count: n });
    else
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        const start = `${y}-${mm}-01`;
        const end = `${y}-${mm}-${lastDay(y, m)}`;
        out.push({ year: y, month: m, start, end, count: await count(ctx, tpl, sid, start, end) });
        await ctx.sleep(ctx.delay);
      }
    if (i < years.length - 1 && ctx.delay > 0) await ctx.sleep(ctx.delay);
  }
  return out;
}

function unzipAll(ctx: FetchContext, items: readonly Item[]): number {
  let n = 0;
  for (const it of items) {
    const zip = path.join(ctx.dest, it.dest);
    if (!fs.existsSync(zip)) continue;
    if (!isZip(zip)) {
      ctx.log.info(`  not a zip: ${zip}`);
      continue;
    }
    const tag = path.basename(zip, ".zip"); // cases-2019-data
    n += unzipTo(zip, path.dirname(zip), {
      rename: (entry) => {
        const ext = path.extname(entry).toLowerCase();
        return ext === ".json" || ext === ".csv"
          ? `${tag}${ext}`
          : `${tag}-${path.basename(entry)}`;
      },
      skipPresent: true,
    });
  }
  return n;
}

export const carol: FetchSystem<CarolOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const thisYear = ctx.now().getFullYear();
    let years = opts.year?.length ? [...new Set(opts.year)].sort((a, b) => a - b) : [];
    if (!years.length)
      for (let y = opts.fromYear ?? FIRST_YEAR; y <= (opts.toYear ?? thisYear); y++) years.push(y);
    if (ctx.limit) years = years.slice(0, ctx.limit);
    const delay = Math.min(ctx.delay, 1);
    let spans: Period[];
    let sid: number;
    let tpl: Template;
    if (ctx.listFile) {
      const saved = JSON.parse(fs.readFileSync(ctx.listFile, "utf-8")) as {
        session: number;
        template: Template;
        periods: Period[];
      };
      sid = saved.session;
      tpl = saved.template;
      spans = saved.periods.filter((p) => years.includes(p.year));
    } else {
      ctx.log.info("CAROL session …");
      sid = await session(ctx);
      tpl = await template(ctx);
      ctx.log.info(`  session ${sid}; counting cases for ${years.length} year(s)`);
      spans = await periods({ ...ctx, delay }, tpl, sid, years);
      fs.writeFileSync(
        path.join(ctx.dest, manifest.fetch!.catalogueFile),
        JSON.stringify({ session: sid, template: tpl, periods: spans }),
        "utf-8",
      );
    }
    const total = spans.reduce((n, s) => n + s.count, 0);
    const formats = opts.export === "both" || !opts.export ? ["data", "summary"] : [opts.export];
    const items = exportItems(tpl, sid, spans, formats, ctx.now().toISOString().slice(0, 10));
    if (opts.refresh)
      for (const it of items) fs.rmSync(path.join(ctx.dest, it.dest), { force: true });
    return {
      items,
      records: [
        ...spans.map((p) => ({ period: tagOf(p), count: p.count })),
        { period: "all", count: total },
      ],
      summary: [`${total} cases in ${spans.length} period(s); ${items.length} export(s)`],
    };
  },
  async postRun(ctx, opts, plan, outcome): Promise<RunOutcome> {
    ctx.log.info(`unzipped ${unzipAll(ctx, plan.items)} file(s)`);
    if (!opts.reports || outcome.interrupted) return outcome;
    const reports: Item[] = [];
    for (const it of plan.items) {
      if (it.extra.format !== "summary") continue;
      const csv = path.join(ctx.dest, it.dest.replace(/\.zip$/, ".csv"));
      if (fs.existsSync(csv))
        reports.push(...reportItems(Number(it.extra.year), fs.readFileSync(csv, "utf-8")));
    }
    ctx.log.info(`\n${reports.length} generated report PDFs named in the summaries\n`);
    const second = await ctx.run(reports, { logName: "_reports-log.tsv" });
    const combined: RunOutcome = {
      ok: outcome.ok + second.ok,
      skip: outcome.skip + second.skip,
      fail: outcome.fail + second.fail,
      bytes: outcome.bytes + second.bytes,
      interrupted: outcome.interrupted || second.interrupted,
      seconds: outcome.seconds + second.seconds,
      logPath: outcome.logPath,
      failures: [...outcome.failures, ...second.failures],
    };
    return combined;
  },
};

export const plugin: BulkPlugin = { manifest, fetch: carol as FetchSystem<never> };
