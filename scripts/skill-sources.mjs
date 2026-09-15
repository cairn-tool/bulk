#!/usr/bin/env node
/**
 * Regenerates the source list in the agent plugin's skill,
 * plugins/bulk/skills/sources/SKILL.md, from the plugin manifests in dist/, so
 * the one line an agent carries per source can never disagree with `bulk sources`.
 *
 *   npm run build && node scripts/skill-sources.mjs          # write
 *   node scripts/skill-sources.mjs --check                   # exit 1 when the skill is stale
 *
 * Only the block between <!-- sources --> and <!-- /sources --> is generated;
 * the prose around it is hand-written. The result is formatted with Prettier so
 * the check agrees with `npm run format:check`. tests/unit/docs.test.ts runs the check.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PLUGINS } = await import(path.join(root, "dist", "plugins", "index.js"));
const { commandsOf } = await import(path.join(root, "dist", "commands", "sources.js"));

const check = process.argv.includes("--check");
const SOURCES_START = "<!-- sources -->";
const SOURCES_END = "<!-- /sources -->";
const file = path.join(root, "plugins", "bulk", "skills", "sources", "SKILL.md");

/** One line per plugin: the id, the manifest summary `bulk sources` prints, its sub-commands. */
function sourcesBlock() {
  return PLUGINS.map(({ manifest }) => {
    const subs = commandsOf(manifest).map((c) => c.slice(manifest.id.length + 1));
    return `- \`${manifest.id}\` — ${manifest.summary} (${subs.join(", ")})`;
  }).join("\n");
}

const current = fs.readFileSync(file, "utf-8");
const start = current.indexOf(SOURCES_START);
const end = current.indexOf(SOURCES_END);
if (start < 0 || end < 0 || end < start) {
  process.stderr.write(`${path.relative(root, file)}: missing ${SOURCES_START} … ${SOURCES_END}\n`);
  process.exit(1);
}
const rendered =
  current.slice(0, start + SOURCES_START.length) +
  "\n\n" +
  sourcesBlock() +
  "\n\n" +
  current.slice(end);
const text = await prettier.format(rendered, {
  ...(await prettier.resolveConfig(file)),
  filepath: file,
});

if (check) {
  if (current !== text) {
    process.stderr.write(
      `stale: ${path.relative(root, file)} — run node scripts/skill-sources.mjs\n`,
    );
    process.exit(1);
  }
} else fs.writeFileSync(file, text, "utf-8");
