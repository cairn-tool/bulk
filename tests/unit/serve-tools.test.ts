import fs from "node:fs";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { PLUGINS } from "../../src/plugins/index.js";
import { SERVE_TOOLS, TOOL_BY_NAME } from "../../src/serve/tools.js";
import { repoRoot } from "../helpers/cli.js";

describe("serve tools", () => {
  it("offers one list tool per catalogue and one query tool per lookup, plus list_sources", () => {
    const expected = ["list_sources"];
    for (const { manifest } of PLUGINS) {
      const base = manifest.id.replace(/-/g, "_");
      if (manifest.fetch) expected.push(`${base}_list`);
      if (manifest.query) expected.push(`${base}_query`);
    }
    expect(SERVE_TOOLS.map((t) => t.name)).toEqual(expected);
    expect(TOOL_BY_NAME.size).toBe(expected.length);
  });

  it("compiles every input schema and requires keys for a query", () => {
    const ajv = new Ajv2020({ strict: false });
    for (const tool of SERVE_TOOLS) {
      const validate = ajv.compile(tool.inputSchema);
      if (tool.name.endsWith("_query")) expect(validate({})).toBe(false);
      else expect(validate({})).toBe(true);
    }
  });

  it("never downloads: no tool is named like a fetch, and the module never imports the runner", () => {
    expect(SERVE_TOOLS.filter((t) => /fetch|download|run/.test(t.name))).toEqual([]);
    const source = fs.readFileSync(path.join(repoRoot, "src", "serve", "tools.ts"), "utf-8");
    expect(source).not.toMatch(/pull\/run\.js|pull\/verify\.js|commands\/fetch\.js/);
  });
});
