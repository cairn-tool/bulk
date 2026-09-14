import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { plugin as ietf } from "../../src/plugins/ietf-rfc/index.js";
import { plugin as itut } from "../../src/plugins/itu-t/index.js";
import { plugin as itur } from "../../src/plugins/itu-r/index.js";
import { plugin as noaa } from "../../src/plugins/noaa-ir/index.js";
import { plugin as nrc } from "../../src/plugins/nrc-adams/index.js";
import { plugin as arxiv } from "../../src/plugins/arxiv/index.js";
import { plugin as yellow } from "../../src/plugins/cern-yellowreports/index.js";
import { plugin as cds } from "../../src/plugins/cern-cds/index.js";
import { plugin as avdata } from "../../src/plugins/ntsb-avdata/index.js";
import { plugin as dockets } from "../../src/plugins/ntsb-dockets/index.js";
import { plugin as carol } from "../../src/plugins/ntsb-carol/index.js";
import { parseTsv } from "../../src/text/tsv.js";
import { PluginHarness } from "../helpers/plugin-harness.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
const harnesses: PluginHarness[] = [];
beforeAll(async () => {
  server = await startSourceServer({
    hosts: [
      "www.rfc-editor.org",
      "www.itu.int",
      "repository.library.noaa.gov",
      "adams-search.nrc.gov",
      "www.nrc.gov",
      "export.arxiv.org",
      "arxiv.org",
      "e-publishing.cern.ch",
      "cds.cern.ch",
      "inspirehep.net",
      "data.ntsb.gov",
    ],
  });
});
afterAll(() => server.close());
afterEach(() => {
  for (const h of harnesses.splice(0)) h.cleanup();
});
const harness = (plugin: Parameters<typeof PluginHarness.prototype.constructor>[0]) => {
  const h = new PluginHarness(plugin, server, { contact: "me@example.org" });
  harnesses.push(h);
  return h;
};

describe("ietf-rfc", () => {
  it("reads the index, selects a range, and falls back through the text renderings", async () => {
    const h = harness(ietf);
    const { plan, outcome } = await h.fetch({ from: 1, to: 9000 });
    expect(plan.summary[0]).toBe("3 RFCs in the index; 3 selected");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "RFC 0000-0999/RFC 1 - Host Software.pdf",
      "RFC 0000-0999/RFC 2 - Host software.pdf",
      "RFC 9000-9999/RFC 9000 - QUIC - A UDP-Based Multiplexed and Secure Transport.pdf",
    ]);
    expect(plan.items[2].extra).toMatchObject({
      date: "2021-May",
      status: "PROPOSED STANDARD",
      formats: "HTML,PDF",
    });
    expect(outcome).toMatchObject({ ok: 3, fail: 0 });
    expect(h.files()).toContain("RFC 0000-0999/RFC 1 - Host Software.pdf");
    expect(h.files()).toContain("RFC 0000-0999/RFC 2 - Host software.txt");
    const missing = await h.plan({ missingFrom: h.dest });
    expect(missing.items).toEqual([]);
    expect(missing.summary[1]).toContain("3 RFC numbers present");
  });
});

describe("itu-t", () => {
  it("takes the catalogue per series, names by the dms id, and logs the TIES page as not a PDF", async () => {
    const h = harness(itut);
    const { plan, outcome } = await h.fetch({ series: ["g"], approvedFrom: "2018-01-01" });
    expect(server.requests.find((r) => r.url.includes("searchRecs"))!.url).toContain(
      "series=G&main_edition_flag=false&approved_from=2018-01-01",
    );
    expect(plan.items.map((i) => i.dest)).toEqual([
      "G-Series - Transmission systems and media, digital systems and networks/ITU-T G.997.2 (2020-03) Cor.1 - Physical layer management for G.fast transceivers - Corrigendum 1.pdf",
      "G-Series - Transmission systems and media, digital systems and networks/ITU-T G.9962 (2018-07) - Management of coordinated multi-line transceivers.pdf",
    ]);
    expect(plan.items[0].url).toContain("id=T-REC-G.997.2-202003-I!Cor1!PDF-E");
    expect(plan.items[1].url).toContain("id=T-REC-G.9962-201807-I!!PDF-E");
    expect(outcome).toMatchObject({ ok: 1, fail: 1 });
    expect(outcome.failures[0].note).toContain("an HTML page instead of the file");
    expect(fs.existsSync(path.join(h.dest, "_itut-api.json"))).toBe(true);
  });
});

describe("itu-r", () => {
  it("crawls the Windows-1252 pages, caches them, ignores script decoys, and selects by status", async () => {
    const h = harness(itur);
    const { plan, outcome } = await h.fetch({ series: ["M"], status: "in-force" });
    expect(plan.summary[0]).toBe("3 editions; 2 selected");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "M-Series - Mobile, radiodetermination, amateur and related satellite services/ITU-R M.1036-8 (2026-02) - Frequency arrangements for IMT – café.pdf",
      "M-Series - Mobile, radiodetermination, amateur and related satellite services/ITU-R M.2101-0 (2017-02) - Modelling and simulation of IMT.pdf",
    ]);
    expect(outcome).toMatchObject({ ok: 2, fail: 0 });
    const pages = server.requests.filter((r) => r.url.startsWith("/rec/R-REC")).length;
    const again = await h.plan({ series: ["M"], since: "2026-01" });
    expect(server.requests.filter((r) => r.url.startsWith("/rec/R-REC")).length).toBe(pages);
    expect(again.items).toHaveLength(1);
    expect(parseTsv(fs.readFileSync(path.join(h.dest, "_editions.tsv"), "utf-8"))).toHaveLength(3);
  });
});

describe("noaa-ir", () => {
  it("probes then reads a collection with the curl User-Agent, verifies sha256, and skips items without a file", async () => {
    const h = harness(noaa);
    await expect(h.plan({})).rejects.toThrow(/--collection/);
    const { plan, outcome } = await h.fetch({ collection: ["6"], from: "2024-01-01" });
    const calls = server.requests.filter((r) => r.host === "repository.library.noaa.gov");
    expect(calls[0].url).toContain("rows=1");
    expect(calls[0].url).toContain("from=2024-01-01T00%3A00%3A00Z");
    expect(calls[0].headers["user-agent"]).toMatch(/^curl\//);
    expect(calls[0].headers.accept).toBe("*/*");
    expect(calls[1].url).toContain("rows=3");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "NWS/2019/436 - Storm surge memorandum.pdf",
      "NWS/2020/437 - An article.pdf",
    ]);
    expect(plan.summary[0]).toContain("by type: Technical Memorandum 1, Journal Article 1");
    expect(outcome).toMatchObject({ ok: 1, fail: 1 });
    expect(outcome.failures[0].note).toBe("sha256 mismatch");
    const typed = await h.plan({ collection: ["6"], type: ["journal article"] });
    expect(typed.items).toHaveLength(1);
  });
});

describe("nrc-adams", () => {
  it("searches by accession and by filters, expands packages, and verifies by magic only", async () => {
    const h = harness(nrc);
    await expect(h.plan({})).rejects.toThrow(/nothing selected/);
    const { plan, outcome } = await h.fetch({
      ml: ["ml11126a118", "ML00000000"],
      packages: true,
      added: ["2011-05-01", "2011-05-31"],
      type: ["Inspection Report"],
    });
    const posts = server.requests
      .filter((r) => r.host === "adams-search.nrc.gov")
      .map((r) => JSON.parse(r.body) as Record<string, unknown>);
    expect(posts[0]).toMatchObject({
      q: "",
      filters: [{ field: "AccessionNumber", value: "ML11126A118", operator: "equals" }],
      anyFilters: [],
      size: 1000,
      skip: 0,
    });
    expect(
      posts.some((p) =>
        JSON.stringify(p.filters).includes(
          "(DateAdded ge '2011-05-01' and DateAdded le '2011-05-31')",
        ),
      ),
    ).toBe(true);
    expect(posts.some((p) => JSON.stringify(p.filters).includes("PackagesFiledIn"))).toBe(true);
    expect(h.logs.join("")).toContain("ML00000000: not found");
    expect(plan.summary[0]).toMatch(/^3 records, 1 packages \(no file\), 2 files/);
    expect(plan.items.map((i) => i.dest)).toEqual([
      "2011/ML11126A118 - Inspection Report 05000255 and 2011002.pdf",
      "2011/ML26237A145 - Package member.pdf",
    ]);
    expect(plan.items[0].bytes).toBe(0);
    expect(plan.items[0].request).toMatchObject({ userAgent: "curl" });
    expect(outcome).toMatchObject({ ok: 2, fail: 0 });
    expect(server.requests.find((r) => r.host === "www.nrc.gov")!.headers["user-agent"]).toMatch(
      /^curl\//,
    );
  });
});

describe("arxiv", () => {
  it("parses the Atom feed, names by version, takes the source too, and treats a 429 as fatal", async () => {
    const h = harness(arxiv);
    await expect(h.plan({})).rejects.toThrow(/--id, or a search/);
    const { plan, outcome } = await h.fetch({
      category: ["cs.CL"],
      author: ["Vaswani"],
      withSource: true,
      limit: 0,
    });
    expect(server.requests.find((r) => r.host === "export.arxiv.org")!.url).toContain(
      "search_query=cat%3Acs.CL+AND+au%3A%22Vaswani%22",
    );
    expect(plan.items.map((i) => i.dest)).toEqual([
      "cs.CL/1706.03762v7 - Attention Is All You Need.pdf",
      "cs.CL/1706.03762v7 - Attention Is All You Need.tar.gz",
      "cs.AR/cs/9901002v1 - An old paper.pdf",
      "cs.AR/cs/9901002v1 - An old paper.tar.gz",
    ]);
    expect(plan.items[0].extra).toMatchObject({
      authors: "Ashish Vaswani; Noam Shazeer",
      categories: "cs.CL; cs.LG",
      published: "2017-06-12",
      comment: "15 pages, 5 figures",
    });
    expect(outcome).toMatchObject({ ok: 3, fail: 1 });
    expect(fs.existsSync(path.join(h.dest, "_feed", "page1.xml"))).toBe(true);
    await expect(h.plan({ id: ["burst"] })).rejects.toThrow(/answered 429/);
  });
});

describe("cern-yellowreports", () => {
  it("follows resumption tokens and takes only articles with a PDF galley", async () => {
    const h = harness(yellow);
    const { plan, outcome } = await h.fetch({});
    expect(plan.summary[0]).toBe("2 records, 1 article PDFs across 1 report(s)");
    expect(plan.items[0].dest).toBe(
      "CERN-2015-001/CERN-2015-001.95 - Introduction to accelerator physics.pdf",
    );
    expect(plan.items[0].extra).toMatchObject({
      authors: "Author, A.; Writer, B.",
      article: "95",
      galley: "61",
    });
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    expect(fs.existsSync(path.join(h.dest, "_oai", "page2.xml"))).toBe(true);
    const filtered = await h.plan({ report: ["cern-2016-002"] });
    expect(filtered.items).toEqual([]);
  });
});

describe("cern-cds", () => {
  it("solves the Anubis gate once, caches the cookie, and pulls files from CDS", async () => {
    const h = harness(cds);
    const { plan, outcome } = await h.fetch({ set: ["cerncds:REPORT"], from: "2026-01-01" });
    expect(plan.summary).toEqual(["1 records", "1 files: cds 1"]);
    expect(plan.items[0].dest).toBe(
      "cerncds-REPORT/CERN-2004-003-V-1 - CAS - CERN Accelerator School - Intermediate Course/CERN-2004-003-V-1.pdf",
    );
    expect(plan.items[0].extra).toMatchObject({ source: "cds", inspire: "777", date: "2004" });
    expect(plan.items[0].request).toMatchObject({ cookieJar: "challenge:anubis:cds.cern.ch" });
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    const pass = server.requests.find((r) => r.url.startsWith("/.within.website"))!;
    expect(pass.url).toContain("id=chal-1");
    expect(pass.url).toMatch(/response=0[0-9a-f]{63}/);
    const jar = path.join(h.env.dir, "cache", "anubis", "cds.cern.ch.jar");
    expect(fs.readFileSync(jar, "utf-8")).toContain("anubis-auth");
    expect(fs.existsSync(path.join(h.dest, "_records", "823808.xml"))).toBe(true);
    const solves = server.requests.filter((r) => r.url.startsWith("/.within.website")).length;
    const search = await h.plan({ query: "reportnumber:CERN-2004-003*" });
    expect(server.requests.filter((r) => r.url.startsWith("/.within.website")).length).toBe(solves);
    expect(search.items[0].extra.title).toBe("CAS (bare)");
  });
  it("falls back to INSPIRE with --no-anubis and reports an OAI error", async () => {
    const h = harness(cds);
    const { plan, outcome } = await h.fetch({ record: ["823808"], noAnubis: true });
    expect(plan.items[0].extra).toMatchObject({ source: "inspire", inspire: "777" });
    expect(plan.items[0].url).toBe("https://inspirehep.net/files/abc");
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    const empty = await h.plan({ set: ["cerncds:EMPTY"], noAnubis: true, noInspire: true });
    expect(empty.items).toEqual([]);
    expect(h.logs.join("")).toContain("noRecordsMatch No matches");
    await expect(h.plan({ query: "x", noAnubis: true })).rejects.toThrow(
      /behind the Anubis challenge/,
    );
  });
});

describe("ntsb-avdata", () => {
  it("parses the listing, names copies by listed date, and filters", async () => {
    const h = harness(avdata);
    const { plan, outcome } = await h.fetch({});
    expect(plan.items.map((i) => i.dest)).toEqual([
      "avall (2026-09-01).zip",
      "up01SEP (2026-09-01).zip",
      "eADMSPUB_DataDictionary (2020-01-15).pdf",
    ]);
    expect(outcome).toMatchObject({ ok: 3, fail: 0 });
    expect((await h.plan({ monthly: true })).items.map((i) => String(i.extra.name))).toEqual([
      "up01SEP.zip",
    ]);
    expect((await h.plan({ only: ["AVALL.ZIP"] })).items).toHaveLength(1);
  });
});

describe("ntsb-dockets", () => {
  it("enumerates through the antiforgery form, reads a docket with sub-dockets, and catches the 0-byte blob", async () => {
    const h = harness(dockets);
    await expect(h.plan({})).rejects.toThrow(/select dockets/);
    const listing = await h.plan({ mode: ["Marine"], since: "2024-01-01" });
    expect(listing.records).toHaveLength(1);
    expect(listing.records![0]).toMatchObject({
      ntsb_number: "DCA24FM019",
      date: "2024-03-26",
      description: "Dali & Key Bridge",
    });
    const { plan, outcome } = await h.fetch({ ntsbNumber: ["DCA96MA070"] });
    expect(plan.items.map((i) => i.dest)).toEqual([
      "DCA96MA070 - TWA Flight 800/Main/0001 - Exhibit 1A - Operations Group Chairman Factual Report.pdf",
      "DCA96MA070 - TWA Flight 800/Main/0002 - Wreckage photos (Redacted).zip",
      "DCA96MA070 - TWA Flight 800/Group B/0001 - Group B report - interviews.pdf",
    ]);
    expect(plan.items[0].url).toBe(
      "https://data.ntsb.gov/Docket/Document/docBLOB?ID=5001&FileExtension=.pdf&FileName=Exhibit%201A.pdf",
    );
    expect(outcome).toMatchObject({ ok: 2, fail: 1 });
    expect(outcome.failures[0].note).toBe("empty body (application/pdf)");
    const state = JSON.parse(
      fs.readFileSync(path.join(h.dest, "DCA96MA070 - TWA Flight 800", "_docket.json"), "utf-8"),
    );
    expect(state).toMatchObject({ Mode: "Aviation", project_id: "101", item_rows: 3 });
    expect(state.sub_dockets).toHaveLength(2);
    expect(fs.existsSync(path.join(h.dest, "DCA96MA070 - TWA Flight 800", "_items.tsv"))).toBe(
      true,
    );
    const pdfOnly = await h.plan({ project: ["101"], pdfOnly: true });
    expect(pdfOnly.items).toHaveLength(2);
    expect(pdfOnly.listColumns).toBeDefined();
  });
});

describe("ntsb-carol", () => {
  it("opens a session, counts a year, exports both formats, unzips, and pulls the named reports", async () => {
    const h = harness(carol);
    const { plan, outcome } = await h.fetch({ year: [2019], reports: true });
    expect(plan.summary[0]).toBe("2 cases in 1 period(s); 2 export(s)");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "2019/cases-2019-data.zip",
      "2019/cases-2019-summary.zip",
    ]);
    const body = JSON.parse(plan.items[0].request!.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      ExportFormat: "data",
      ResultSetSize: 500,
      SessionId: 4242,
      TargetCollection: "cases",
    });
    expect(body.ResultSetOffset).toBeUndefined();
    expect(JSON.stringify(body.QueryGroups)).toContain('"Values":["2019-01-01","2019-12-31"]');
    expect(outcome).toMatchObject({ ok: 3, fail: 0 });
    expect(h.files()).toEqual(
      expect.arrayContaining([
        "2019/cases-2019-data.json",
        "2019/cases-2019-summary.csv",
        "2019/cases-2019-summary-readme.txt",
        "2019/reports/ERA19LA001 - Cessna, Inc 172.pdf",
        "_reports-log.tsv",
      ]),
    );
    const counts = await h.plan({ year: [2019, 1950] });
    expect(counts.records).toEqual([
      { period: "1950", count: 0 },
      { period: "2019", count: 2 },
      { period: "all", count: 2 },
    ]);
    expect(counts.items).toHaveLength(2);
  });
});
