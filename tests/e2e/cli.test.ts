import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { tempEnv } from "../helpers/env.js";

describe("bulk cli", () => {
  it("prints help at every level", async () => {
    const top = await runCli(["--help"]);
    expect(top.exitCode).toBe(0);
    expect(top.stdout).toContain("bulk <plugin> fetch|list|query");
    const plugin = await runCli(["ntsb-reports", "--help"]);
    expect(plugin.stdout).toMatch(/fetch \[options\]\s+Pull every NTSB/);
    expect(plugin.stdout).toContain("list");
    const fetch = await runCli(["ntsb-reports", "fetch", "--help"]);
    for (const flag of [
      "--mode <MODE>",
      "--dest <dir>",
      "--delay <s>",
      "--limit <n>",
      "--list-file <file>",
      "--dry-run",
      "--format <fmt>",
      "--envelope",
    ])
      expect(fetch.stdout).toContain(flag);
    expect(fetch.stdout).toContain("130  Interrupted");
    const query = await runCli(["openlibrary", "query", "--help"]);
    for (const flag of [
      "--find <file>",
      "--from <file>",
      "--cache <file>",
      "--no-cache",
      "--refresh",
      "--tsv <file>",
    ])
      expect(query.stdout).toContain(flag);
  });

  it("reports the version", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("lists the plugins and rejects an unknown one", async () => {
    const list = await runCli(["sources"]);
    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain("ntsb-reports");
    expect(list.stdout).toContain("openlibrary query");
    const json = await runCli(["sources", "-fj"]);
    const payload = JSON.parse(json.stdout);
    expect(
      payload.plugins.find((p: { id: string }) => p.id === "openlibrary").hosts[0].userAgent,
    ).toBe("polite");
    const bad = await runCli(["sources", "--plugin", "nope"]);
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr).toContain("Unknown plugin: nope");
    const unknown = await runCli(["nope", "fetch"]);
    expect(unknown.exitCode).toBe(1);
  });

  it("refuses a fetch without a destination and names the config key", async () => {
    const env = tempEnv();
    try {
      const result = await runCli(["ntsb-reports", "fetch"], { env: env.env });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("plugins.ntsb-reports.dest");
    } finally {
      env.cleanup();
    }
  });

  it("rejects --envelope without json and an unknown format", async () => {
    const env = tempEnv();
    try {
      const a = await runCli(["sources", "--envelope"], { env: env.env });
      expect(a.exitCode).toBe(1);
      expect(a.stderr).toContain("--envelope requires --format json");
      const b = await runCli(["sources", "--format", "yaml"], { env: env.env });
      expect(b.exitCode).toBe(1);
    } finally {
      env.cleanup();
    }
  });

  it("wraps json in the envelope on request", async () => {
    const { stdout } = await runCli(["sources", "-fj", "--envelope"]);
    const payload = JSON.parse(stdout);
    expect(payload).toMatchObject({
      schemaVersion: "1",
      command: "sources",
      ok: true,
      exitCode: 0,
    });
    expect(payload.schema).toContain("/v1/sources.json");
    expect(payload.data.count).toBeGreaterThan(0);
  });
});
