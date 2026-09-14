import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../helpers/cli.js";

const source = fs.readFileSync(path.join(repoRoot, "src", "cli.ts"), "utf-8");

/**
 * Registration must stay cheap: every command module and every plugin engine is
 * reached through a dynamic import, so `--help`, `describe` and completion never
 * load a parser or an HTTP client. `tests/e2e/startup.test.ts` proves the same
 * against the compiled process.
 */
describe("src/cli.ts imports", () => {
  it("never statically imports a command module or a plugin engine", () => {
    const statics = [...source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+"([^"]+)";/gm)].map(
      (m) => m[1],
    );
    expect(statics.filter((s) => s.startsWith("./commands/"))).toEqual([]);
    expect(statics.filter((s) => s.startsWith("./plugins/") && s !== "./plugins/index.js")).toEqual(
      [],
    );
    expect(statics).toContain("./plugins/index.js");
  });

  it("reaches every action through await import()", () => {
    const actions = source.match(/\.action\(/g)?.length ?? 0;
    const dynamic = source.match(/await import\("\.\/commands\/[a-z-]+\.js"\)/g)?.length ?? 0;
    expect(actions).toBeGreaterThan(5);
    expect(dynamic).toBe(actions);
  });

  it("returns what every action calls", () => {
    for (const block of source.matchAll(/\.action\(async \([^)]*\) => \{([\s\S]*?)\n\s*\}\)/g)) {
      expect(block[1], block[1]).toMatch(/return \w+\(/);
    }
  });
});
