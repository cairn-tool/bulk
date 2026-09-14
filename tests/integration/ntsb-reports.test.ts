import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildFetchContext } from "../../src/plugin/context.js";
import { plugin } from "../../src/plugins/ntsb-reports/index.js";
import { runItems } from "../../src/pull/run.js";
import { parseTsv } from "../../src/text/tsv.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";
import { tempEnv, testRuntime } from "../helpers/env.js";

let server: SourceServer;
let env: ReturnType<typeof tempEnv>;
beforeAll(async () => (server = await startSourceServer({ hosts: ["www.ntsb.gov"] })));
afterAll(() => server.close());
beforeEach(() => (env = tempEnv()));
afterEach(() => env.cleanup());

function context(dest: string, opts: { limit?: number; listFile?: string } = {}) {
  const runtime = testRuntime({ hosts: server.hosts, cacheDir: path.join(env.dir, "cache") });
  fs.mkdirSync(dest, { recursive: true });
  return buildFetchContext({
    pluginId: "ntsb-reports",
    runtime,
    stream: { write: () => undefined, isTTY: false },
    quiet: true,
    delay: 0,
    dest,
    limit: opts.limit ?? 0,
    listFile: opts.listFile,
  });
}

describe("ntsb-reports against the fixture server", () => {
  it("enumerates the list, saves it, files items by mode, and dedupes the trailing-space twin", async () => {
    const dest = path.join(env.dir, "dest");
    const { ctx, jars } = context(dest);
    const plan = await plugin.fetch!.plan(ctx, {} as never);
    jars.close();
    expect(fs.existsSync(path.join(dest, "_reports-list.json"))).toBe(true);
    expect(plan.items.map((i) => i.dest)).toEqual([
      "Aviation/AAR0003 - In-flight Breakup Over the Atlantic Ocean - Trans World Airlines Flight 800.pdf",
      "Highway/HAB1808 - Highway brief (3).pdf",
      "Highway/HAB1808 - Highway brief (4).pdf",
      "Marine/MAR2401 - Contact of Cargo Vessel with Bridge.pdf",
    ]);
    expect(plan.items[1].extra).toMatchObject({
      mode: "Highway",
      modes: "",
      stem: "HAB1808",
      report_number: "HAB-18/08",
    });
    expect(plan.summary[0]).toMatch(/^4 reports listed/);
    expect(server.requests[0].headers.accept).toBe("application/json; odata=verbose");
  });

  it("selects by mode and honours --list-file without a network call", async () => {
    const dest = path.join(env.dir, "dest");
    const before = server.requests.length;
    const listFile = path.join(
      __dirname,
      "..",
      "fixtures",
      "sources",
      "www.ntsb.gov",
      "reports-list.json",
    );
    const { ctx, jars } = context(dest, { listFile });
    const plan = await plugin.fetch!.plan(ctx, { mode: ["Marine"] } as never);
    jars.close();
    expect(plan.items.map((i) => String(i.extra.stem))).toEqual(["MAR2401"]);
    expect(plan.manifestItems).toHaveLength(4);
    expect(server.requests.length).toBe(before);
  });

  it("downloads and verifies the files, fails the 0-byte twin, and resumes on a second run", async () => {
    const dest = path.join(env.dir, "dest");
    const { ctx, jars } = context(dest);
    const plan = await plugin.fetch!.plan(ctx, {} as never);
    const first = await runItems(ctx.http, plan.items, dest, { delay: 0 });
    expect(first).toMatchObject({ ok: 3, skip: 0, fail: 1 });
    expect(first.failures[0]).toMatchObject({ note: "empty body (application/pdf)" });
    const log = parseTsv(fs.readFileSync(path.join(dest, "_download-log.tsv"), "utf-8"));
    expect(log).toHaveLength(4);
    expect(log.filter((r) => r.status === "ok").every((r) => r.sha256.length === 64)).toBe(true);
    const second = await runItems(ctx.http, plan.items, dest, { delay: 0 });
    expect(second).toMatchObject({ ok: 0, skip: 3, fail: 1 });
    jars.close();
    expect(fs.readdirSync(path.join(dest, "Aviation"))).toEqual([
      "AAR0003 - In-flight Breakup Over the Atlantic Ocean - Trans World Airlines Flight 800.pdf",
    ]);
  });
});
