import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { tempEnv } from "../helpers/env.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
let env: ReturnType<typeof tempEnv>;
beforeAll(async () => (server = await startSourceServer({ hosts: ["www.ntsb.gov"] })));
afterAll(() => server.close());
beforeEach(() => (env = tempEnv()));
afterEach(() => env.cleanup());

const withHosts = () => ({ ...env.env, BULK_HOSTS: server.hostsEnv });

describe("bulk ntsb-reports (e2e)", () => {
  it("lists the catalogue as a table, a TSV, and JSON", async () => {
    const table = await runCli(["ntsb-reports", "list", "--mode", "Aviation"], {
      env: withHosts(),
    });
    expect(table.exitCode).toBe(0);
    expect(table.stdout).toMatch(/^stem\s+mode\s+adopted\s+bytes\s+title/);
    expect(table.stdout).toContain("AAR0003");
    expect(table.stdout).not.toContain("MAR2401");
    expect(table.stdout).toContain("1 reports listed");

    const tsv = path.join(env.dir, "list.tsv");
    const written = await runCli(["ntsb-reports", "list", "--tsv", tsv], { env: withHosts() });
    expect(written.stdout).toContain(`4 rows -> ${tsv}`);
    expect(fs.readFileSync(tsv, "utf-8").split("\n")[0]).toBe("stem\tmode\tadopted\tbytes\ttitle");

    const json = await runCli(["ntsb-reports", "list", "-fj", "--limit", "2"], {
      env: withHosts(),
    });
    const payload = JSON.parse(json.stdout);
    expect(payload.count).toBe(2);
    expect(payload.rows[0]).toMatchObject({ mode: "Aviation", stem: "AAR0003" });
  });

  it("plans with --dry-run, fetches, and resumes", async () => {
    const dest = path.join(env.dir, "reports");
    const dry = await runCli(["ntsb-reports", "fetch", "--dest", dest, "--dry-run", "-fj"], {
      env: withHosts(),
    });
    expect(dry.exitCode).toBe(0);
    const dryPayload = JSON.parse(dry.stdout);
    expect(dryPayload).toMatchObject({
      plugin: "ntsb-reports",
      dryRun: true,
      planned: 4,
      outcome: null,
    });
    expect(fs.existsSync(path.join(dest, "_manifest.tsv"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "_download-log.tsv"))).toBe(false);

    const run = await runCli(["ntsb-reports", "fetch", "--dest", dest, "--delay", "0", "-fj"], {
      env: withHosts(),
    });
    expect(run.exitCode).toBe(2);
    const payload = JSON.parse(run.stdout);
    expect(payload.outcome).toMatchObject({ ok: 3, skip: 0, fail: 1, interrupted: false });
    expect(payload.outcome.failures[0].note).toBe("empty body (application/pdf)");
    expect(run.stderr).toBe("");

    const again = await runCli(
      ["ntsb-reports", "fetch", "--dest", dest, "--delay", "0", "--mode", "Aviation"],
      { env: withHosts() },
    );
    expect(again.exitCode).toBe(0);
    expect(again.stderr).toContain("skip (present)");
    expect(again.stderr).toContain("ok 0  skip 1  fail 0");
  });

  it("takes the destination and mode defaults from the configuration", async () => {
    const dest = path.join(env.dir, "archive");
    fs.mkdirSync(path.dirname(env.env.BULK_CONFIG!), { recursive: true });
    fs.writeFileSync(
      env.env.BULK_CONFIG!,
      [
        "version: 1",
        `archive: ${dest}`,
        "delay: 0",
        "plugins:",
        "  ntsb-reports:",
        "    dest: ntsb/reports",
        "    options: { mode: [Marine] }",
        "",
      ].join("\n"),
    );
    const run = await runCli(["ntsb-reports", "fetch", "-fj"], { env: withHosts() });
    expect(run.exitCode).toBe(0);
    const payload = JSON.parse(run.stdout);
    expect(payload.dest).toBe(path.join(dest, "ntsb", "reports"));
    expect(payload.planned).toBe(1);
    expect(fs.readdirSync(path.join(dest, "ntsb", "reports", "Marine"))).toHaveLength(1);
  });

  it("refuses a malformed configuration before running anything", async () => {
    fs.mkdirSync(path.dirname(env.env.BULK_CONFIG!), { recursive: true });
    fs.writeFileSync(env.env.BULK_CONFIG!, "version: 1\nplugins:\n  ntsb-reports: { dets: x }\n");
    const run = await runCli(["ntsb-reports", "list"], { env: withHosts() });
    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain("Unknown plugins.ntsb-reports key: dets");
  });
});
