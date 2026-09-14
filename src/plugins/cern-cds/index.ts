import fs from "node:fs";
import path from "node:path";
import { inspireFiles } from "../../clients/inspire.js";
import type { BulkPlugin, FetchContext, FetchPlan, FetchSystem, Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";
import { manifest } from "./manifest.js";
import {
  BASE,
  HOST,
  OAI,
  challenged,
  describe,
  filesOf,
  marcXml,
  parseOai,
  parseSearch,
  type MarcRecord,
} from "./parse.js";

export interface CdsOptions {
  set?: string[];
  from?: string;
  until?: string;
  query?: string;
  record?: string[];
  noAnubis?: boolean;
  noInspire?: boolean;
  allFormats?: boolean;
}

const JAR = `challenge:anubis:${HOST}`;

async function oaiRecords(
  ctx: FetchContext,
  sets: string[],
  opts: CdsOptions,
): Promise<[string, MarcRecord][]> {
  const out: [string, MarcRecord][] = [];
  for (const s of sets) {
    let params = new URLSearchParams({ verb: "ListRecords", metadataPrefix: "marcxml", set: s });
    if (opts.from) params.set("from", opts.from);
    if (opts.until) params.set("until", opts.until);
    let n = 0;
    for (;;) {
      const response = await ctx.http.request({
        url: `${OAI}?${params}`,
        accept: "application/xml",
        timeoutMs: 300_000,
        signal: ctx.signal,
      });
      const text = await response.text();
      if (response.status !== 200) throw new Error(`oai2d: HTTP ${response.status}`);
      if (challenged(text))
        throw new Error(
          "cds.cern.ch answered the OAI request with its bot challenge; see docs/sources/cern-cds/access.md",
        );
      const { records, token, total, error } = parseOai(text);
      if (error) {
        ctx.log.info(`  set ${s}: ${error}`);
        break;
      }
      out.push(...records);
      n += records.length;
      ctx.log.info(`  set ${s}: ${n} records${total ? ` (of ${total})` : ""}`);
      if (!token) break;
      params = new URLSearchParams({ verb: "ListRecords", resumptionToken: token });
      await ctx.sleep(ctx.delay);
    }
  }
  return out;
}

/** The documented Invenio API: /search?p=…&of=xm&jrec=…&rg=… (behind the Anubis gate). */
async function searchRecords(
  ctx: FetchContext,
  query: string,
  rg = 50,
): Promise<[string, MarcRecord][]> {
  const out: [string, MarcRecord][] = [];
  let jrec = 1;
  for (;;) {
    const params = new URLSearchParams({ p: query, of: "xm", jrec: String(jrec), rg: String(rg) });
    const response = await ctx.http.request({
      url: `${BASE}/search?${params}`,
      cookieJar: ctx.jar(JAR),
      timeoutMs: 300_000,
      signal: ctx.signal,
    });
    const text = await response.text();
    if (challenged(text))
      throw new Error(
        "cds.cern.ch/search is behind the Anubis challenge and no valid cookie is cached; run without --no-anubis (the default solves it), or use --set / --record",
      );
    if (response.status !== 200) throw new Error(`search: HTTP ${response.status}`);
    const { records, total } = parseSearch(text);
    out.push(...records);
    ctx.log.info(`  ${out.length} of ${total ?? "?"}`);
    if (!records.length || (total !== undefined && out.length >= total)) break;
    jrec += rg;
    await ctx.sleep(ctx.delay);
  }
  return out;
}

async function getRecords(ctx: FetchContext, ids: string[]): Promise<[string, MarcRecord][]> {
  const out: [string, MarcRecord][] = [];
  for (let i = 0; i < ids.length; i++) {
    const params = new URLSearchParams({
      verb: "GetRecord",
      metadataPrefix: "marcxml",
      identifier: `oai:cds.cern.ch:${ids[i]}`,
    });
    const response = await ctx.http.request({
      url: `${OAI}?${params}`,
      accept: "application/xml",
      timeoutMs: 120_000,
      signal: ctx.signal,
    });
    const text = await response.text();
    const got = response.status === 200 && !challenged(text) ? parseOai(text).records : [];
    if (!got.length) ctx.log.info(`  ${ids[i]}: not returned (HTTP ${response.status})`);
    else out.push([ids[i], got[0][1]]);
    if (i < ids.length - 1) await ctx.sleep(ctx.delay);
  }
  return out;
}

/**
 * Turn records into items. With the gate solved the files come straight from CDS
 * (the auth cookie is sent); otherwise INSPIRE is consulted for each and CDS is the
 * last resort (which will fail with the challenge page, logged as such).
 */
async function itemsFor(
  ctx: FetchContext,
  folder: string,
  records: [string, MarcRecord][],
  anubisOk: boolean,
  viaInspire: boolean,
  allFormats: boolean,
): Promise<Item[]> {
  const items: Item[] = [];
  const recordsDir = path.join(ctx.dest, "_records");
  fs.mkdirSync(recordsDir, { recursive: true });
  for (let i = 0; i < records.length; i++) {
    const [rid, marc] = records[i];
    fs.writeFileSync(path.join(recordsDir, `${rid}.xml`), marcXml(rid, marc), "utf-8");
    const d = describe(rid, marc);
    const files = filesOf(marc, allFormats);
    if (!files.length) continue;
    const sub = safeName(`${d.report_number || rid} - ${cleanTitle(d.title)}`, 120);
    let inspireId: string | null = null;
    let inspireDocs: { url?: string; key?: string; filename?: string }[] = [];
    if (viaInspire) {
      const found = await inspireFiles(
        ctx.http,
        {
          inspire: d.inspire || undefined,
          record: rid,
          reportNumber: d.report_number || undefined,
        },
        { signal: ctx.signal, sleep: ctx.sleep, delay: Math.min(ctx.delay, 1) },
      );
      inspireId = found.controlNumber;
      inspireDocs = found.documents;
    }
    files.forEach((f, k) => {
      const name = decodeURIComponent(f.url.split("/").pop() ?? "");
      const cdsUrl = f.url.replace(/^http:\/\//, "https://");
      let source = "cds";
      let url = cdsUrl;
      let jar: string | undefined = anubisOk ? JAR : undefined;
      if (!anubisOk && inspireDocs.length) {
        // match by filename stem when INSPIRE has several, else its first fulltext for the main file
        const stem = name.replace(/\.[^.]+$/, "");
        const match = inspireDocs.filter(
          (x) => (x.key ?? x.filename ?? "").replace(/\.[^.]+$/, "") === stem,
        );
        const pick = match.length ? match : k === 0 ? [inspireDocs[0]] : [];
        if (pick.length && pick[0].url) {
          source = "inspire";
          url = pick[0].url;
          jar = undefined;
        }
      }
      items.push({
        dest: `${folder}/${sub}/${name}`,
        url,
        bytes: source === "cds" ? f.bytes : 0,
        request: jar ? { cookieJar: jar } : undefined,
        extra: {
          ...d,
          file: name,
          bytes: f.bytes,
          source,
          cds_url: cdsUrl,
          inspire: inspireId ?? d.inspire,
          list_id: `${rid}-${k}`,
        },
      });
    });
    if (viaInspire && (i + 1) % 20 === 0)
      ctx.log.info(`  ${i + 1}/${records.length} records matched against INSPIRE`);
  }
  dedupeDests(items);
  return items;
}

export const cds: FetchSystem<CdsOptions> = {
  async plan(ctx, opts): Promise<FetchPlan> {
    if (!(opts.record?.length || opts.query || opts.set?.length))
      throw new Error("select records with --set (OAI-PMH), --query (the search API) or --record");
    // The Anubis gate covers /search and every file URL (not /oai2d). Solve it unless
    // --no-anubis; --query needs it, files use it, INSPIRE is the fallback when it is off.
    let anubisOk = false;
    if (!opts.noAnubis) {
      const { ok, note } = await ctx.ensureChallenge("anubis", `${BASE}/record/2`);
      anubisOk = ok;
      if (!ok)
        ctx.log.info(`  Anubis not solved (${note}); files will come from INSPIRE where available`);
    }
    if (opts.query && !anubisOk)
      throw new Error(
        "--query uses the CDS search API, which is behind the Anubis challenge; drop --no-anubis so it can be solved, or use --set / --record",
      );
    let records: [string, MarcRecord][];
    let folder: string;
    if (opts.record?.length) {
      records = await getRecords(ctx, opts.record);
      folder = "records";
    } else if (opts.query) {
      records = await searchRecords(ctx, opts.query);
      folder = safeName(cleanTitle(opts.query), 60);
    } else {
      records = await oaiRecords(ctx, opts.set!, opts);
      folder = safeName(opts.set!.join("-").replace(/:/g, "-"), 60);
    }
    if (ctx.limit) records = records.slice(0, ctx.limit);
    ctx.log.info(`${records.length} records`);
    const items = await itemsFor(
      ctx,
      folder,
      records,
      anubisOk,
      !anubisOk && !opts.noInspire,
      Boolean(opts.allFormats),
    );
    const bySource = new Map<string, number>();
    for (const it of items)
      bySource.set(String(it.extra.source), (bySource.get(String(it.extra.source)) ?? 0) + 1);
    return {
      items,
      summary: [
        `${records.length} records`,
        `${items.length} files: ${[...bySource.entries()].map(([k, v]) => `${k} ${v}`).join(", ")}`,
      ],
    };
  },
};

export const plugin: BulkPlugin = { manifest, fetch: cds as FetchSystem<never> };
