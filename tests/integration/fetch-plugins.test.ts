import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { plugin as osti } from "../../src/plugins/osti/index.js";
import { plugin as nist } from "../../src/plugins/nist-techpubs/index.js";
import { plugin as archiveItems } from "../../src/plugins/archive-items/index.js";
import { plugin as archiveWayback } from "../../src/plugins/archive-wayback/index.js";
import { plugin as ntisNtrl } from "../../src/plugins/ntis-ntrl/index.js";
import { plugin as treesearch } from "../../src/plugins/usda-treesearch/index.js";
import { parseTsv } from "../../src/text/tsv.js";
import { PluginHarness } from "../helpers/plugin-harness.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
const harnesses: PluginHarness[] = [];
beforeAll(async () => {
  server = await startSourceServer({
    hosts: [
      "www.osti.gov",
      "api.github.com",
      "github.com",
      "objects.githubusercontent.com",
      "doi.org",
      "nvlpubs.nist.gov",
      "archive.org",
      "web.archive.org",
      "ntrl.ntis.gov",
      "apps.dtic.mil",
      "research.fs.usda.gov",
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

describe("osti fetch", () => {
  it("refuses without a selection, then pages the API, records everything, and pulls the full-text records", async () => {
    const h = harness(osti);
    await expect(h.plan({})).rejects.toThrow(/narrow the selection/);
    const { plan, outcome } = await h.fetch({
      identifier: "ORNL-TM-2578",
      from: "1965",
      until: "1975-06",
    });
    const call = server.requests.find(
      (r) => r.host === "www.osti.gov" && r.url.includes("identifier="),
    )!;
    expect(call.url).toContain("publication_date_start=01%2F01%2F1965");
    expect(call.url).toContain("publication_date_end=06%2F31%2F1975");
    expect(call.url).toContain("has_fulltext=true");
    expect(plan.summary[0]).toBe("2 records, 1 with full text, 1 citation-only");
    expect(plan.items[0].dest).toBe(
      "Technical Report/ORNL-TM-2578 - Molten-Salt Reactor Program semiannual progress report.pdf",
    );
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    expect(h.files()).toEqual([
      "Technical Report/ORNL-TM-2578 - Molten-Salt Reactor Program semiannual progress report.pdf",
      "_download-log.tsv",
      "_records.json",
      "_records.tsv",
    ]);
    expect(parseTsv(fs.readFileSync(path.join(h.dest, "_records.tsv"), "utf-8"))[1]).toMatchObject({
      has_fulltext: "no",
      report_number: "ORNL-TM-2578-VOL.2",
    });
  });
});

describe("nist-techpubs fetch", () => {
  it("takes the catalogue from the release once, streams the MODS, and pulls through the DOI redirect", async () => {
    const h = harness(nist);
    await expect(h.plan({})).rejects.toThrow(/narrow the selection/);
    const first = await h.plan({ series: ["SP"] });
    expect(first.items.map((i) => i.dest)).toEqual([
      "NIST.SP/NIST SP 800-53r5 - Security and Privacy Controls for Information Systems and Organizations.pdf",
    ]);
    expect(first.items[0].extra).toMatchObject({
      authors: "Ross Ron",
      corporate: "Joint Task Force",
      date: "2020",
      genre: "technical report",
      subjects: "security controls; privacy",
    });
    expect(fs.existsSync(path.join(h.dest, "_catalogue", "allrecords-MODS.xml"))).toBe(true);
    expect(
      JSON.parse(fs.readFileSync(path.join(h.dest, "_catalogue", "release.json"), "utf-8")).tag,
    ).toBe("Aug2026");
    const downloads = server.requests.filter(
      (r) => r.host === "objects.githubusercontent.com",
    ).length;
    const second = await h.plan({ id: ["nbs circ 2e1"], from: "1900", until: "1910" });
    expect(server.requests.filter((r) => r.host === "objects.githubusercontent.com").length).toBe(
      downloads,
    );
    expect(second.items[0].extra.title).toBe(
      "Circular of the Bureau of Standards no. 2: An early one",
    );
    const { outcome } = await h.fetch({ query: "security privacy" });
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    expect(
      server.requests.some((r) => r.host === "doi.org" && r.url === "/10.6028/NIST.SP.800-53r5"),
    ).toBe(true);
  });
});

describe("archive-items fetch", () => {
  it("resolves items from a collection search, skips derivatives, verifies sha1, and keeps the metadata", async () => {
    const h = harness(archiveItems);
    await expect(h.plan({})).rejects.toThrow(/--query, --collection or --identifier/);
    const { plan, outcome } = await h.fetch({ collection: ["nasa_techdocs"] });
    expect(
      server.requests.find((r) => r.url.startsWith("/services/search/v1/scrape"))!.url,
    ).toContain("q=collection%3Anasa_techdocs");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "nasa_techdocs/nasa_techdoc_19730060780/19730060780.pdf",
      "nasa_techdocs/nasa_techdoc_19730060780/19730060780_djvu.txt",
    ]);
    expect(plan.items[0].digest).toMatchObject({ algorithm: "sha1" });
    expect(outcome).toMatchObject({ ok: 1, fail: 1 });
    expect(outcome.failures[0].note).toBe("sha1 mismatch");
    expect(fs.existsSync(path.join(h.dest, "_metadata", "nasa_techdoc_19730060780.json"))).toBe(
      true,
    );
    const all = await h.plan({
      identifier: ["nasa_techdoc_19730060780", "nope"],
      allFiles: true,
      suffix: [".jpg"],
    });
    expect(all.items.map((i) => String(i.extra.file))).toEqual(["__ia_thumb.jpg"]);
    expect(h.logs.join("")).toContain("nope: no such item");
  });
});

describe("archive-wayback fetch", () => {
  it("survives a CDX 503, keeps the newest capture per URL, names by host and path, and pulls the raw bytes", async () => {
    const h = harness(archiveWayback);
    await expect(h.plan({})).rejects.toThrow(/--url or --urls-from/);
    const { plan, outcome } = await h.fetch({
      url: ["pcisig.com*"],
      match: "prefix",
      mimetype: "application/pdf",
    });
    const cdxCalls = server.requests.filter((r) => r.url.startsWith("/cdx/"));
    expect(cdxCalls).toHaveLength(2);
    expect(cdxCalls[0].url).toContain("url=pcisig.com&");
    expect(cdxCalls[0].url).toContain("matchType=prefix");
    expect(cdxCalls[0].url).toContain("filter=mimetype%3Aapplication%2Fpdf");
    expect(plan.items.map((i) => i.dest)).toEqual([
      "www.pcisig.com/specifications - other-x=1.pdf",
      "www.pcisig.com/specifications - pciexpress - base.pdf",
    ]);
    expect(plan.items[1].url).toBe(
      "https://web.archive.org/web/20100301000000id_/http://www.pcisig.com/specifications/pciexpress/base.pdf",
    );
    expect(outcome).toMatchObject({ ok: 2, fail: 0 });
    expect(fs.existsSync(path.join(h.dest, "_cdx.tsv"))).toBe(true);
    const every = await h.plan({ url: ["pcisig.com*"], match: "prefix", allCaptures: true });
    expect(every.items).toHaveLength(3);
    expect(every.items[1].dest).toContain("(20081001120000)");
  });
});

describe("ntis-ntrl fetch", () => {
  it("harvests records through the JSF session and resolves documents at the agencies", async () => {
    const h = harness(ntisNtrl);
    await expect(h.plan({})).rejects.toThrow(/--query or --accession/);
    const { plan, outcome } = await h.fetch({ query: "radar" });
    expect(plan.summary[0]).toBe("3 record(s), 2 with a document");
    expect(plan.warnings?.[0]).toContain("1 without a source: N7113901");
    const rows = parseTsv(fs.readFileSync(path.join(h.dest, "_records.tsv"), "utf-8"));
    expect(rows.map((r) => [r.accession, r.source])).toEqual([
      ["N7113901", ""],
      ["ADA130537", "DTIC"],
      ["ORNLTM3177", "OSTI 4144811 (ORNL-TM-2578)"],
    ]);
    expect(plan.items.map((i) => i.dest)).toEqual([
      "Nuclear Science/ADA130537 - Radar Cross Section Handbook.pdf",
      "Nuclear Science/ORNLTM3177 - Fluoride volatility processing.pdf",
    ]);
    expect(outcome).toMatchObject({ ok: 2, fail: 0 });
  });
  it("tries NTRL's own download when asked and records the empty body", async () => {
    const h = harness(ntisNtrl);
    const { plan, outcome } = await h.fetch({ accession: ["ORNLTM3177"], source: "ntrl" });
    expect(plan.items[0].request).toMatchObject({ method: "POST", cookieJar: "session:ntrl" });
    expect(outcome.fail).toBe(1);
    expect(outcome.failures[0].note).toBe("empty body (application/pdf)");
    const post = server.requests.find((r) => r.method === "POST" && r.url.includes("titleDetail"))!;
    expect(post.body).toContain("detailsTBarForm%3AdownloadLink=detailsTBarForm%3AdownloadLink");
    expect(post.body).toContain("javax.faces.ViewState=VS-D");
  });
  it("harvests records only", async () => {
    const h = harness(ntisNtrl);
    const plan = await h.plan({ accession: ["ADA130537"], recordsOnly: true });
    expect(plan.items).toEqual([]);
    expect(plan.records).toHaveLength(1);
  });
});

describe("usda-treesearch fetch", () => {
  it("walks the search view, reads each page, narrows, and pulls the PDFs on offer", async () => {
    const h = harness(treesearch);
    await expect(h.plan({})).rejects.toThrow(/--query, --id, or --all/);
    const { plan, outcome } = await h.fetch({ query: "fire" });
    expect(plan.summary[0]).toBe("2 publication(s), 1 with a PDF, 1 citation-only");
    expect(plan.items[0].dest).toBe(
      "Rocky Mountain Research Station/67890 - Fire behavior fuel models.pdf",
    );
    expect(plan.items[0].extra).toMatchObject({
      authors: "Smith, J.; Doe, A.",
      year: "2020",
      type: "General Technical Report",
      size_text: "1.2 MB",
      keywords: "fire, fuel",
    });
    expect(outcome).toMatchObject({ ok: 1, fail: 0 });
    const all = await h.plan({ all: true, withCitationsOnly: true, station: "pacific" });
    expect(all.records!.map((r) => r.id)).toEqual(["11111"]);
    expect(all.items).toEqual([]);
  });
});
