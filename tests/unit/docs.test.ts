import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLUGINS } from "../../src/plugins/index.js";
import { COMMAND_CONTRACTS } from "../../src/contract/registry.js";
import { repoRoot } from "../helpers/cli.js";

const docs = path.join(repoRoot, "docs");
const read = (rel: string): string => fs.readFileSync(path.join(docs, rel), "utf-8");
const exists = (rel: string): boolean => fs.existsSync(path.join(docs, rel));

/**
 * Every plugin has an overview (purpose, scope, types of data), an access page
 * (the research), and a page per sub-command; every page is linked from the
 * contents and the command listing. The docs are part of adding a plugin.
 */
describe("documentation completeness", () => {
  const contents = read("_contents.md");
  const commands = read("commands.md");
  const sources = read("sources.md");

  it.each(PLUGINS.map((p) => p.manifest))(
    "$id has its source pages and command pages",
    (manifest) => {
      for (const page of [
        `sources/${manifest.id}/overview.md`,
        `sources/${manifest.id}/access.md`,
      ]) {
        expect(exists(page), page).toBe(true);
        expect(contents, `_contents.md links ${page}`).toContain(`(${page})`);
        expect(sources, `sources.md links ${page}`).toContain(`${manifest.id}/`);
      }
      const overview = read(`sources/${manifest.id}/overview.md`);
      for (const heading of ["## Purpose", "## Scope", "## Types of data"])
        expect(overview, `${manifest.id} overview has ${heading}`).toContain(heading);
      const subs = [
        ...(manifest.fetch ? ["fetch", "list"] : []),
        ...(manifest.query ? ["query"] : []),
      ];
      for (const sub of subs) {
        const page = `commands/${manifest.id}/${sub}.md`;
        expect(exists(page), page).toBe(true);
        expect(contents, `_contents.md links ${page}`).toContain(`(${page})`);
        expect(commands, `commands.md links ${page}`).toContain(`(${page})`);
        const text = read(page);
        const options = sub === "query" ? manifest.query!.options : manifest.fetch!.options;
        for (const option of options)
          expect(text, `${page} documents --${option.name}`).toContain(`--${option.name}`);
      }
    },
  );

  it("documents every top-level command the registry declares", () => {
    for (const id of Object.keys(COMMAND_CONTRACTS)) {
      if (PLUGINS.some((p) => id.startsWith(`${p.manifest.id} `))) continue;
      const page = `commands/${id.replace(/ /g, "/")}.md`;
      expect(exists(page), page).toBe(true);
      expect(commands, `commands.md links ${page}`).toContain(`(${page})`);
    }
  });

  it("has command pages that match the manifests (node scripts/docs-commands.mjs)", () => {
    // Runs against dist/, which `pretest` builds; the unit suite is never run without it.
    const r = spawnSync(process.execPath, ["scripts/docs-commands.mjs", "--check"], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    expect(r.status, r.stderr).toBe(0);
  });

  it("has an agent skill that lists every source (node scripts/skill-sources.mjs)", () => {
    // The block between the markers is generated from the manifests; the check
    // runs against dist/ like the command pages. The direct assertions hold even
    // if the generator itself is broken.
    const skill = fs.readFileSync(
      path.join(repoRoot, "plugins", "bulk", "skills", "sources", "SKILL.md"),
      "utf-8",
    );
    for (const { manifest } of PLUGINS) {
      expect(skill, `skill names ${manifest.id}`).toContain(`- \`${manifest.id}\` — `);
      expect(skill, `skill carries the summary of ${manifest.id}`).toContain(manifest.summary);
    }
    expect(skill).toContain("bulk <plugin> --docs");
    const r = spawnSync(process.execPath, ["scripts/skill-sources.mjs", "--check"], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    expect(r.status, r.stderr).toBe(0);
  });

  it("documents the --docs flag that prints the pages themselves", () => {
    expect(read("commands/common.md")).toContain("## Docs");
    expect(commands).toContain("`bulk <plugin> --docs`");
  });

  it("has the shared pages", () => {
    for (const page of [
      "commands/common.md",
      "install.md",
      "development.md",
      "releasing.md",
      "contract.md",
      "configuration.md",
      "formats.md",
      "guide.md",
      "guide/fetching.md",
      "guide/querying.md",
      "guide/rate-limiting.md",
      "guide/bot-challenges.md",
      "guide/writing-a-plugin.md",
      "standards.md",
      "plugins.md",
    ]) {
      expect(exists(page), page).toBe(true);
      expect(contents).toContain(`(${page})`);
    }
  });
});
