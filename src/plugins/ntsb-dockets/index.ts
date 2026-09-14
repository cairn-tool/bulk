import fs from "node:fs";
import path from "node:path";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { loadJson, saveJson } from "../../text/json-file.js";
import { writeTsv } from "../../text/tsv.js";
import { manifest } from "./manifest.js";
import {
  BASE,
  DOCKET_COLUMNS,
  ITEM_COLUMNS,
  SEARCH,
  antiforgeryToken,
  docketFolder,
  docketItems,
  iso,
  parseDocket,
  parseSearchResults,
  searchForm,
  selectDockets,
  type DocketRow,
  type Selection,
} from "./parse.js";

export interface DocketsOptions extends Selection {
  pdfOnly?: boolean;
}

/** The all-time docket list: GET the form with a cookie jar, extract the token, POST with the same jar. */
async function fetchDocketList(ctx: FetchContext): Promise<DocketRow[]> {
  const file = ctx.listFile ?? path.join(ctx.dest, manifest.fetch!.catalogueFile);
  if (!ctx.listFile) {
    const jar = ctx.jar("session:dockets");
    ctx.log.info("Fetching the docket search form");
    const form = await ctx.http.request({
      url: SEARCH,
      accept: "text/html",
      cookieJar: jar,
      timeoutMs: 120_000,
      signal: ctx.signal,
    });
    const token = antiforgeryToken(await form.text());
    if (form.status !== 200 || !token)
      throw new Error(`could not read the search form (HTTP ${form.status})`);
    ctx.log.info(`Searching every docket -> ${file}`);
    const result = await ctx.http.request({
      url: SEARCH,
      method: "POST",
      body: searchForm(token, "1900-01-01", "2099-12-31"),
      accept: "text/html",
      cookieJar: jar,
      timeoutMs: 300_000,
      signal: ctx.signal,
    });
    if (result.status !== 200) throw new Error(`docket search failed: HTTP ${result.status}`);
    fs.writeFileSync(file, await result.text(), "utf-8");
  }
  const rows = parseSearchResults(fs.readFileSync(file, "utf-8"));
  if (!rows.length)
    throw new Error(
      `the search returned no dockets — the page layout may have changed; see ${file}`,
    );
  return rows;
}

export const dockets: FetchSystem<DocketsOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    const named = Boolean(opts.ntsbNumber?.length || opts.project?.length);
    const selecting =
      named || Boolean(opts.office?.length || opts.mode?.length || opts.since || opts.until);
    if (!selecting)
      throw new Error(
        "select dockets with --ntsb-number, --project, --office, --mode, --since/--until (see --help)",
      );
    const rows = await fetchDocketList(ctx);
    writeTsv(path.join(ctx.dest, "_dockets.tsv"), rows, DOCKET_COLUMNS);
    let chosen = selectDockets(rows, opts);
    const summary = [
      `${rows.length} docket rows, ${new Set(rows.map((r) => r.project_id)).size} dockets listed; ${chosen.length} selected`,
    ];
    if (!chosen.length)
      return { items: [], records: [], summary, warnings: ["no docket matched the selection"] };
    if (ctx.limit && !named) chosen = chosen.slice(0, ctx.limit);

    const items: Item[] = [];
    const warnings: string[] = [];
    for (let i = 0; i < chosen.length; i++) {
      if (ctx.signal.aborted) break;
      const r = chosen[i];
      ctx.log.info(`[${i + 1}/${chosen.length}] ${r.ntsb_number} ${r.description.slice(0, 60)}`);
      const response = await ctx.http.request({
        url: `${BASE}/Docket?ProjectID=${r.project_id}`,
        accept: "text/html",
        timeoutMs: 300_000,
        signal: ctx.signal,
      });
      const page = await response.text();
      if (response.status !== 200 || page.length < 200) {
        ctx.log.info(`  FAIL docket page HTTP ${response.status} (${page.length} bytes)`);
        continue;
      }
      const { header, items: parsed } = parseDocket(page);
      // The folder is named from the page's own (parent) description, not from whichever sub-docket row the search listed first.
      const folder = docketFolder({
        ...r,
        description: String(header.Description ?? "") || r.description,
      });
      const dir = path.join(ctx.dest, folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "_docket.html"), page, "utf-8");
      const previous = loadJson<{ sub_dockets?: { items: number }[] } | null>(
        path.join(dir, "_docket.json"),
        null,
      );
      const before = previous
        ? (previous.sub_dockets ?? []).reduce((n, s) => n + s.items, 0)
        : null;
      const stamp = ctx.now().toISOString().slice(0, 10);
      saveJson(
        path.join(dir, "_docket.json"),
        {
          ...header,
          project_id: r.project_id,
          ntsb_number: r.ntsb_number,
          fetched: stamp,
          item_rows: parsed.length,
        },
        1,
      );
      let note = `  ${parsed.length} items in ${header.sub_dockets.length} sub-docket(s)`;
      if (before !== null && parsed.length < before) {
        note += `  ** fewer than last time (${before}) — the docket changed at the source; nothing is deleted`;
        warnings.push(
          `${r.ntsb_number}: ${parsed.length} items, fewer than the ${before} recorded last time; nothing is deleted`,
        );
      }
      ctx.log.info(note);
      const docketList = docketItems(folder, r, header, parsed, Boolean(opts.pdfOnly));
      writeTsv(
        path.join(dir, "_items.tsv"),
        docketList.map((it) => ({ ...it.extra, dest: it.dest, url: it.url })),
        ITEM_COLUMNS,
      );
      items.push(...docketList);
      if (i < chosen.length - 1 && ctx.delay > 0) await ctx.sleep(Math.min(ctx.delay, 2));
    }
    summary.push(`${items.length} items`);
    return {
      items,
      records: named
        ? items.map((it) => ({
            item: it.extra.item,
            pages: it.extra.pages,
            type: it.extra.type,
            dest: it.dest,
          }))
        : chosen.map((r) => ({ ...r, date: iso(r.date) })),
      listColumns: named
        ? [
            { key: "item", align: "right", width: 5 },
            { key: "pages", align: "right", width: 5 },
            { key: "type", width: 26 },
            { key: "dest" },
          ]
        : undefined,
      summary,
      warnings,
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: dockets as FetchSystem<never> };
