import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CommandExit } from "../command-result.js";
import type { PluginManifest } from "../plugin/types.js";
import { commandsOf } from "./sources.js";

// From dist/commands/docs.js (and from src/commands/docs.ts under vitest) the
// package root is two levels up; `docs/` ships in the tarball for this command.
const DOCS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "docs");

/** The shared pages `bulk --docs` prints, in reading order. */
const SHARED_PAGES = [
  "commands/common.md",
  "configuration.md",
  "guide/fetching.md",
  "guide/querying.md",
  "guide/rate-limiting.md",
  "guide/bot-challenges.md",
];

export interface DocsOptions {
  docs?: boolean;
}

/** The pages `bulk <plugin> --docs` prints: the overview, the access research, then every sub-command. */
export function pluginPages(manifest: PluginManifest): string[] {
  const subs = commandsOf(manifest).map((command) => command.slice(manifest.id.length + 1));
  return [
    `sources/${manifest.id}/overview.md`,
    `sources/${manifest.id}/access.md`,
    ...subs.map((sub) => `commands/${manifest.id}/${sub}.md`),
  ];
}

/**
 * `bulk --docs` and `bulk <plugin> --docs` — the documentation, verbatim from
 * `docs/`, each page under a comment naming its path. There is no `--format`:
 * like `--help`, the document is the output.
 *
 * Without `--docs` a plugin group (or the program) has nothing to do, so the
 * caller's help is printed and the exit is 1, as commander did before the
 * groups had an action.
 */
export async function docsAction(
  manifest: PluginManifest | null,
  opts: DocsOptions,
  help: () => void,
): Promise<void> {
  if (!opts.docs) {
    help();
    throw new CommandExit(1);
  }
  const pages = manifest ? pluginPages(manifest) : SHARED_PAGES;
  const chunks: string[] = [];
  for (const page of pages) {
    const file = path.join(DOCS_DIR, page);
    let text: string;
    try {
      text = fs.readFileSync(file, "utf-8");
    } catch (error) {
      throw new Error(`Documentation page missing: ${file}`, { cause: error });
    }
    chunks.push(`<!-- docs/${page} -->\n\n${text.trimEnd()}\n`);
  }
  process.stdout.write(chunks.join("\n"));
}
