import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { plugin as crossref } from "../../src/plugins/crossref/index.js";
import { plugin as ntrs } from "../../src/plugins/ntrs/index.js";
import { plugin as osti } from "../../src/plugins/osti/index.js";
import { plugin as nist } from "../../src/plugins/nist-techpubs/index.js";
import { plugin as archiveItems } from "../../src/plugins/archive-items/index.js";
import { plugin as ntisNtrl } from "../../src/plugins/ntis-ntrl/index.js";
import { plugin as usdaNal } from "../../src/plugins/usda-nal/index.js";
import { PluginHarness } from "../helpers/plugin-harness.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
const harnesses: PluginHarness[] = [];
beforeAll(async () => {
  server = await startSourceServer({
    hosts: [
      "api.crossref.org",
      "ntrs.nasa.gov",
      "www.osti.gov",
      "doi.org",
      "nvlpubs.nist.gov",
      "archive.org",
      "ntrl.ntis.gov",
      "search.nal.usda.gov",
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

describe("crossref query", () => {
  it("normalises DOI forms, reads the work, and reports a 404 as a miss", async () => {
    const h = harness(crossref);
    const results = await h.query([
      "https://doi.org/10.1080/16000870.2018.1440870",
      "doi:10.1000/missing",
      "junk",
    ]);
    expect(Object.keys(results)).toEqual(["10.1080/16000870.2018.1440870", "10.1000/missing"]);
    expect(results["10.1080/16000870.2018.1440870"]).toMatchObject({
      title: "A title about ocean waves",
      authors: ["Ann Author", "Bob Writer", "Consortium"],
      issued: "2018-03-07",
      container: "Tellus A",
      cited_by: 7,
      licence: "http://creativecommons.org/licenses/by/4.0/",
    });
    expect(results["10.1000/missing"]).toBeNull();
    const ua = server.requests.find((r) => r.host === "api.crossref.org")!.headers["user-agent"];
    expect(ua).toContain("mailto:me@example.org");
  });
  it("searches citation text", async () => {
    const h = harness(crossref);
    const results = await h.query(["Introduction to Algorithms Cormen"], { search: true, rows: 3 });
    const r = results["Introduction to Algorithms Cormen"] as Record<string, unknown>;
    expect(r.total).toBe(2);
    expect((r.hits as unknown[]).length).toBe(2);
    expect(r.doi).toBe("10.1080/16000870.2018.1440870");
    expect(server.requests.at(-1)!.url).toContain(
      "query.bibliographic=Introduction+to+Algorithms+Cormen&rows=3",
    );
  });
});

describe("ntrs query", () => {
  it("looks an accession up and scores a title search", async () => {
    const h = harness(ntrs);
    const byId = await h.query(["19730060780", "19730060781", "short"]);
    expect(byId["19730060780"]).toMatchObject({
      id: 19730060780,
      reportNumbers: ["MSFC-MAN-503", "NASA-TM-X-72128"],
      center: "MSFC",
      date: "1968-11-01T00:00:00.000Z",
    });
    expect(byId["19730060781"]).toBeNull();
    expect(byId.short).toBeUndefined();
    const search = await h.query(["Saturn V Flight Manual (SA-503) - Vol 1"], {
      search: true,
      minScore: 0.6,
    });
    expect(search["Saturn V Flight Manual (SA-503) - Vol 1"]).toMatchObject({
      id: 19730060780,
      score: 1,
    });
    expect(server.requests.at(-1)!.url).toContain("q=Saturn+V+Flight+Manual");
  });
});

describe("osti query", () => {
  it("rewrites the designation and keeps every match", async () => {
    const h = harness(osti);
    const results = await h.query(["ORNL-TM-2578-V2", "NONE"]);
    expect(
      server.requests.find((r) => r.url.includes("identifier=ORNL-TM-2578-VOL.2")),
    ).toBeTruthy();
    expect(results["ORNL-TM-2578-V2"]).toMatchObject({
      report_number: "ORNL-TM-2578",
      osti_id: 4144811,
    });
    expect((results["ORNL-TM-2578-V2"] as Record<string, unknown[]>).matches).toHaveLength(2);
    expect(results.NONE).toBeNull();
  });
});

describe("nist-techpubs query", () => {
  it("looks a designation up through Crossref and resolves the PDF", async () => {
    const h = harness(nist);
    const results = await h.query(
      ["NIST SP 800-53r5", "https://doi.org/10.6028/NIST.SP.800-53r5", "not a designation!"],
      { resolve: true },
    );
    expect(Object.keys(results)).toEqual(["NIST.SP.800-53r5"]);
    expect(results["NIST.SP.800-53r5"]).toMatchObject({
      series: "NIST.SP",
      title: "Security and Privacy Controls for Information Systems and Organizations",
      issued: "2020-09",
      abstract: "Abstract text here.",
      pdf: "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf",
    });
  });
});

describe("archive-items query", () => {
  it("reads item metadata with its files, misses an unknown item, and searches", async () => {
    const h = harness(archiveItems);
    const results = await h.query(["nasa_techdoc_19730060780", "nope"], { files: true });
    expect(results.nasa_techdoc_19730060780).toMatchObject({
      title: "Saturn V Flight Manual SA-503",
      creator: "NASA",
      files: 3,
      collection: "nasa_techdocs; nasa",
    });
    expect((results.nasa_techdoc_19730060780 as Record<string, unknown[]>).file_list).toHaveLength(
      3,
    );
    expect(results.nope).toBeNull();
    const search = await h.query(["collection:nasa_techdocs"], { search: true, rows: 10 });
    expect(search["collection:nasa_techdocs"]).toMatchObject({ total: 1, shown: 1 });
  });
});

describe("ntis-ntrl query", () => {
  it("reads a detail page, reports the download offer, and pages a search through the JSF session", async () => {
    const h = harness(ntisNtrl);
    const results = await h.query(["ornl-tm-3177", "ADA130537", "ZZZZ9999"], { abstract: true });
    expect(results.ORNLTM3177).toMatchObject({
      title: "Fluoride volatility processing.",
      authors: "Carr, W.",
      pages: "40",
      categories: "Nuclear Science; Reactors",
      ntrl_offers: "Download PDF",
      abstract: "An abstract.",
    });
    expect(results.ADA130537).toMatchObject({ corporate: "Naval Research Lab", ntrl_offers: "—" });
    expect(results.ZZZZ9999).toMatchObject({ error: "http 404" });
    const search = await h.query(["radar"], { search: true, rows: 10 });
    const r = search.radar as Record<string, unknown>;
    expect(r.total).toBe(3);
    expect((r.hits as { accession: string }[]).map((x) => x.accession)).toEqual([
      "N7113901",
      "ADA130537",
      "ORNLTM3177",
    ]);
    const post = server.requests.find((q) => q.method === "POST" && q.host === "ntrl.ntis.gov")!;
    expect(post.headers.cookie).toContain("JSESSIONID=ABC");
    expect(post.body).toContain("searchResultsForm%3AsearchResultsTable_first=2");
  });
});

describe("usda-nal query", () => {
  it("prefers the $$Q heading for names and keeps every candidate", async () => {
    const h = harness(usdaNal);
    const results = await h.query(["soybean rust"], { field: "title", scope: "agricola", rows: 5 });
    expect(results["soybean rust"]).toMatchObject({
      title: "Soybean rust: a review",
      creators: ["Bromfield, K. R.", "Else, S."],
      isbn: "0890540624",
      doi: "10.1000/soy",
      total: 2,
    });
    expect((results["soybean rust"] as Record<string, unknown[]>).matches).toHaveLength(2);
    expect(server.requests.at(-1)!.url).toContain("q=title%2Ccontains%2Csoybean+rust");
    expect(server.requests.at(-1)!.url).toContain("scope=agricola");
  });
});

describe("query cache", () => {
  it("is keyed by the normalised key and serves the second run", async () => {
    const h = harness(crossref);
    const file = path.join(h.env.dir, "c.json");
    await h.query(["10.1080/16000870.2018.1440870"], {}, file);
    const calls = server.requests.length;
    await h.query(["https://doi.org/10.1080/16000870.2018.1440870"], {}, file);
    expect(server.requests.length).toBe(calls);
    expect(Object.keys(JSON.parse(fs.readFileSync(file, "utf-8")))).toEqual([
      "10.1080/16000870.2018.1440870",
    ]);
  });
});
