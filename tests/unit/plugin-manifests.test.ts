import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FETCH_COMMON, LIST_COMMON, QUERY_COMMON, camel } from "../../src/plugin/options.js";
import { PLUGINS } from "../../src/plugins/index.js";
import { repoRoot } from "../helpers/cli.js";

const pluginsDir = path.join(repoRoot, "src", "plugins");
const onDisk = fs
  .readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const RESERVED = new Set(["format", "envelope", "quiet"]);

describe("plugin manifests", () => {
  it("lists every plugin directory exactly once, in a stable order", () => {
    const ids = PLUGINS.map((p) => p.manifest.id);
    expect([...ids].sort()).toEqual(onDisk);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
  });

  it.each(onDisk)("%s: the manifest imports only types and matches its directory", (id) => {
    const text = fs.readFileSync(path.join(pluginsDir, id, "manifest.ts"), "utf-8");
    const imports = [...text.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)";/gm)];
    for (const [, isType, specifier] of imports) {
      expect(isType, `${id}: value import of ${specifier}`).toBeTruthy();
      expect(specifier).toBe("../../plugin/types.js");
    }
    const entry = PLUGINS.find((p) => p.manifest.id === id)!;
    expect(entry.manifest.id).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(entry.manifest.hosts.length).toBeGreaterThan(0);
    expect(entry.manifest.fetch || entry.manifest.query).toBeTruthy();
    expect(fs.existsSync(path.join(pluginsDir, id, "index.ts"))).toBe(true);
  });

  it.each(PLUGINS.map((p) => p.manifest))(
    "$id: option names are unique and never shadow a common option",
    (manifest) => {
      for (const [decls, common] of [
        [manifest.fetch?.options, [...FETCH_COMMON, ...LIST_COMMON, { name: "dest" }]],
        [manifest.query?.options, QUERY_COMMON],
      ] as const) {
        if (!decls) continue;
        const names = decls.map((d) => d.name);
        expect(new Set(names).size).toBe(names.length);
        for (const name of names) {
          expect(
            common.map((c) => c.name),
            `${manifest.id}: ${name} shadows a common option`,
          ).not.toContain(name);
          expect(RESERVED.has(camel(name)), `${manifest.id}: ${name} is reserved`).toBe(false);
          expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
        }
      }
      if (manifest.fetch) {
        expect(manifest.fetch.manifestColumns).toContain("dest");
        expect(manifest.fetch.manifestColumns).toContain("url");
        expect(manifest.fetch.catalogueFile).toMatch(/^_/);
        expect(manifest.fetch.listColumns.length).toBeGreaterThan(0);
      }
      if (manifest.query) {
        expect(manifest.query.batchSize).toBeGreaterThanOrEqual(1);
        expect(manifest.query.columns.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(PLUGINS)("$manifest.id: the engine exports what the manifest declares", async (entry) => {
    const plugin = await entry.load();
    expect(plugin.manifest).toBe(entry.manifest);
    expect(Boolean(plugin.fetch)).toBe(Boolean(entry.manifest.fetch));
    expect(Boolean(plugin.query)).toBe(Boolean(entry.manifest.query));
  });
});
