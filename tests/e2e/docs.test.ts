import { describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";

/**
 * `--docs` prints the documentation verbatim from `docs/`, which ships in the
 * package for exactly this: an agent reads a source's overview, access research
 * and command pages on demand instead of carrying them in its context.
 */
describe("bulk --docs", () => {
  it("prints a fetch plugin's overview, access research and command pages, in order", async () => {
    const { stdout, exitCode } = await runCli(["ntsb-reports", "--docs"]);
    expect(exitCode).toBe(0);
    const markers = stdout.split("\n").filter((line) => line.startsWith("<!-- docs/"));
    expect(markers).toEqual([
      "<!-- docs/sources/ntsb-reports/overview.md -->",
      "<!-- docs/sources/ntsb-reports/access.md -->",
      "<!-- docs/commands/ntsb-reports/fetch.md -->",
      "<!-- docs/commands/ntsb-reports/list.md -->",
    ]);
    expect(stdout).toContain("# NTSB investigation reports library");
    expect(stdout).toContain("access research");
    expect(stdout).toContain("# `ntsb-reports fetch`");
  });

  it("prints only the query page for a query-only plugin", async () => {
    const { stdout, exitCode } = await runCli(["openlibrary", "--docs"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("<!-- docs/commands/openlibrary/query.md -->");
    expect(stdout).toContain("# `openlibrary query`");
    expect(stdout).not.toContain("fetch.md");
  });

  it("prints the shared behaviour, configuration and guides at the top level", async () => {
    const { stdout, exitCode } = await runCli(["--docs"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("<!-- docs/commands/common.md -->");
    expect(stdout).toContain("<!-- docs/configuration.md -->");
    expect(stdout).toContain("<!-- docs/guide/fetching.md -->");
  });

  it("still shows help and exits 1 when a plugin is named without a command", async () => {
    const bare = await runCli(["ntsb-reports"]);
    expect(bare.exitCode).toBe(1);
    expect(bare.stdout).toBe("");
    expect(bare.stderr).toContain("Usage: bulk ntsb-reports");
    const excess = await runCli(["ntsb-reports", "nope"]);
    expect(excess.exitCode).toBe(1);
    expect(excess.stderr).toContain("too many arguments");
  });
});
