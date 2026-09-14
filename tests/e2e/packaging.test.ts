import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../helpers/cli.js";

describe("packaging", () => {
  it("ships dist, README and LICENSE, and nothing from tests or src", () => {
    const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    const files = (JSON.parse(out)[0].files as { path: string }[]).map((f) => f.path);
    expect(files).toContain("dist/cli.js");
    expect(files).toContain("dist/plugins/index.js");
    expect(files).toContain("README.md");
    expect(files).toContain("LICENSE");
    expect(files).toContain("package.json");
    expect(files.some((f) => f.startsWith("tests/") || f.startsWith("src/"))).toBe(false);
  });
});
