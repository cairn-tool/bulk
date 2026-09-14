import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { tempEnv } from "../helpers/env.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";

let server: SourceServer;
let env: ReturnType<typeof tempEnv>;
beforeAll(async () => (server = await startSourceServer({ hosts: ["openlibrary.org"] })));
afterAll(() => server.close());
beforeEach(() => (env = tempEnv()));
afterEach(() => env.cleanup());

const withHosts = () => ({ ...env.env, BULK_HOSTS: server.hostsEnv });

describe("bulk openlibrary query (e2e)", () => {
  it("prints a table, reports skipped keys, and exits 0 when something was found", async () => {
    const result = await runCli(["openlibrary", "query", "9780262033848", "0071449590", "junk"], {
      env: withHosts(),
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Introduction to Algorithms");
    expect(result.stdout).toContain("Data Structures Demystified: A Self-Teaching Guide");
    expect(result.stdout).toContain("2 of 2 found");
    expect(result.stderr).toContain("not a valid ISBN, skipped: junk");
    expect(result.stderr).toMatch(/\[1\/2\] 50\.0% {2}9780262033848\s+Introduction to Algorithms/);
  });

  it("exits 2 when nothing was found and 1 when there was nothing to look up", async () => {
    const miss = await runCli(["openlibrary", "query", "9780000000002", "-fj"], {
      env: withHosts(),
    });
    expect(miss.exitCode).toBe(2);
    expect(JSON.parse(miss.stdout)).toMatchObject({
      plugin: "openlibrary",
      total: 1,
      found: 0,
      results: { "9780000000002": null },
    });
    const none = await runCli(["openlibrary", "query", "junk"], { env: withHosts() });
    expect(none.exitCode).toBe(1);
  });

  it("writes a TSV, and serves a re-run from the cache", async () => {
    const tsv = path.join(env.dir, "books.tsv");
    const cache = path.join(env.dir, "ol.json");
    const first = await runCli(
      ["openlibrary", "query", "9780262033848", "--cache", cache, "--tsv", tsv],
      { env: withHosts() },
    );
    expect(first.exitCode).toBe(0);
    expect(fs.readFileSync(tsv, "utf-8")).toContain("isbn\ttitle\tauthors\tdate\tpublisher\tpages");
    const calls = server.requests.length;
    const second = await runCli(["openlibrary", "query", "9780262033848", "--cache", cache], {
      env: withHosts(),
    });
    expect(second.exitCode).toBe(0);
    expect(second.stderr).toContain("cached: Introduction to Algorithms");
    expect(server.requests.length).toBe(calls);
  });

  it("uses the configured cache file and --from", async () => {
    fs.mkdirSync(path.dirname(env.env.BULK_CONFIG!), { recursive: true });
    fs.writeFileSync(
      env.env.BULK_CONFIG!,
      "version: 1\nplugins:\n  openlibrary: { cache: true }\n",
    );
    const from = path.join(env.dir, "keys.txt");
    fs.writeFileSync(from, "# two keys\n9780262033848\n\n978-0-07-144959-5\n");
    const result = await runCli(["openlibrary", "query", "--from", from, "-fj"], {
      env: withHosts(),
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).found).toBe(2);
    expect(fs.existsSync(path.join(env.env.BULK_CACHE!, "query", "openlibrary.json"))).toBe(true);
  });
});
