import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cliPath, repoRoot } from "../helpers/cli.js";

const register = path.join(repoRoot, "tests", "helpers", "import-log-register.mjs");
let logPath: string;

beforeEach(() => {
  logPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bulk-imports-")), "log.txt");
  fs.writeFileSync(logPath, "");
});
afterEach(() => fs.rmSync(path.dirname(logPath), { recursive: true, force: true }));

function modulesLoadedBy(args: string[]): string[] {
  fs.writeFileSync(logPath, "");
  const result = spawnSync(process.execPath, ["--import", register, cliPath, ...args], {
    encoding: "utf-8",
    env: { ...process.env, CI: "1", IMPORT_LOG: logPath },
  });
  expect(result.error).toBeUndefined();
  return fs.readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
}

const under = (urls: string[], segment: string): string[] =>
  [...new Set(urls.filter((url) => url.includes(segment)))].sort();

/**
 * `src/cli.ts` reaches each command module through `await import()` and each
 * plugin engine through the manifest's `load()`, so `--help` builds the whole
 * tree from manifests alone. Asserted on which modules resolved, never on time.
 */
describe("cli startup", () => {
  it("registers the tree without loading a command module or a plugin engine", () => {
    const loaded = modulesLoadedBy(["--help"]);
    expect(under(loaded, "/dist/commands/")).toEqual([]);
    expect(
      under(loaded, "/dist/plugins/").filter(
        (u) => !u.endsWith("/manifest.js") && !u.endsWith("/plugins/index.js"),
      ),
    ).toEqual([]);
    expect(under(loaded, "/dist/pull/")).toEqual([]);
    expect(under(loaded, "cheerio")).toEqual([]);
  });

  it("loads exactly one command module and one plugin engine for a plugin command", () => {
    const loaded = modulesLoadedBy(["ntsb-reports", "fetch", "--help"]);
    expect(under(loaded, "/dist/commands/")).toEqual([]);
    const sources = modulesLoadedBy(["sources"]);
    expect(under(sources, "/dist/commands/")).toEqual([
      `file://${path.join(repoRoot, "dist", "commands", "sources.js")}`,
    ]);
  });
});
