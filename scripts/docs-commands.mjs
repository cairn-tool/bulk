#!/usr/bin/env node
/**
 * Regenerates docs/commands/<plugin>/{fetch,list,query}.md from the plugin
 * manifests in dist/, so an option table can never disagree with --help.
 *
 *   npm run build && node scripts/docs-commands.mjs          # write
 *   node scripts/docs-commands.mjs --check                   # exit 1 when a page is stale
 *
 * Each page keeps a hand-written block between <!-- notes --> and <!-- /notes -->;
 * everything else is regenerated, then formatted with Prettier so the check agrees with
 * `npm run format:check`. tests/unit/docs.test.ts runs the check.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PLUGINS } = await import(path.join(root, "dist", "plugins", "index.js"));
const { FETCH_COMMON, LIST_COMMON, QUERY_COMMON, flagsOf } = await import(
  path.join(root, "dist", "plugin", "options.js")
);

const check = process.argv.includes("--check");
const NOTES_START = "<!-- notes -->";
const NOTES_END = "<!-- /notes -->";

function optionRow(decl) {
  const flags = `\`${flagsOf(decl)}\``;
  const def =
    "default" in decl && decl.default !== undefined
      ? `\`${String(decl.default)}\``
      : decl.kind === "boolean"
        ? "`false`"
        : "—";
  let desc = decl.description.replace(/\|/g, "\\|").replace(/([^.])$/, "$1.");
  if (decl.choices) desc += ` One of ${decl.choices.map((c) => `\`${c}\``).join(", ")}.`;
  if (decl.repeatable && !/repeatable/i.test(desc)) desc += " Repeatable.";
  if (decl.required) desc += " **Required.**";
  return `| ${flags} | ${def} | ${desc} |`;
}

function table(decls) {
  return [
    "| Option | Default | Description |",
    "| --- | --- | --- |",
    ...decls.map(optionRow),
  ].join("\n");
}

const COMMON_FOOTER = [
  "| `--format <fmt>` | `llm` | `llm`, `human`, or `json`. |",
  "| `--envelope` | `false` | Wrap `--format json` output in the result envelope. |",
  "| `--quiet` | `false` | No progress lines on stderr. |",
  "| `-h`, `--help` | — | Show help. |",
];

function existingNotes(file) {
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf-8");
  const i = text.indexOf(NOTES_START);
  const j = text.indexOf(NOTES_END);
  if (i === -1 || j === -1) return "";
  return text.slice(i + NOTES_START.length, j).trim();
}

function examples(list) {
  return ["```bash", ...list, "```"].join("\n");
}

function fetchPage(manifest, notes) {
  const f = manifest.fetch;
  return `# \`${manifest.id} fetch\`

## Synopsis

\`\`\`text
bulk ${manifest.id} fetch [options]
\`\`\`

${f.description}

A fetch refuses to run without a destination: pass \`--dest\`, or set
\`plugins.${manifest.id}.dest\` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (\`${f.catalogueFile}\`), \`_manifest.tsv\` is written before the first download, every file is
verified, every transfer is logged to \`_download-log.tsv\`, and re-running the same command resumes.
${f.selectionRequired ? "\nThis command requires a selection; a whole-catalogue pull is refused.\n" : ""}
## Options

${table(f.options)}

Common fetch options:

${table(FETCH_COMMON)}
${COMMON_FOOTER.join("\n")}

## Files written

Under the destination: \`${f.catalogueFile}\` (the raw catalogue), \`_manifest.tsv\` with the columns
${f.manifestColumns.map((c) => `\`${c}\``).join(", ")}, \`_download-log.tsv\`, and the files themselves.
${(f.notes ?? []).map((n) => `\n${n}`).join("")}
${NOTES_START}
${notes}
${NOTES_END}

## Examples

${examples(f.examples.filter((e) => e.includes(" fetch")))}

## Exit codes

| Code | Meaning |
| --- | --- |
| \`0\` | Every selected item is present and verified. |
| \`1\` | Invocation, configuration, or catalogue error; nothing pulled. |
| \`2\` | One or more items failed; the log says which. Re-run to retry. |
| \`130\` | Interrupted with Ctrl-C; re-run to resume. |

## Related

- [\`${manifest.id} list\`](list.md) — the catalogue, without downloading.
- [${manifest.name}](../../sources/${manifest.id}/overview.md) — what the source publishes.
- [Access research](../../sources/${manifest.id}/access.md) — how the source is reached, and what fails.
`;
}

function listPage(manifest, notes) {
  const f = manifest.fetch;
  const listExamples = f.examples
    .filter((e) => e.includes(" list") || e.includes(" fetch"))
    .slice(0, 3)
    .map((e) =>
      e
        .replace(" fetch ", " list ")
        .replace(/ --dest \S+/, "")
        .replace(/ --dry-run/, ""),
    );
  return `# \`${manifest.id} list\`

## Synopsis

\`\`\`text
bulk ${manifest.id} list [options]
\`\`\`

Enumerates the catalogue with the same selection options as [\`${manifest.id} fetch\`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
${f.listColumns.map((c) => `\`${c.header ?? c.key}\``).join(", ")}), written to a file with \`--tsv\`,
or emitted as JSON with \`--format json\`. The catalogue snapshot lands in a temporary directory unless
\`--dest\` names where to keep it.

## Options

${table(f.options)}

Common list options:

${table(LIST_COMMON)}
| \`--dest <dir>\` | temporary | Keep the catalogue snapshot in this directory. |
${COMMON_FOOTER.join("\n")}

${NOTES_START}
${notes}
${NOTES_END}

## Examples

${examples(listExamples)}

## Exit codes

| Code | Meaning |
| --- | --- |
| \`0\` | Catalogue written. |
| \`1\` | Invocation, configuration, or catalogue error. |
| \`130\` | Interrupted. |

## Related

- [\`${manifest.id} fetch\`](fetch.md)
- [${manifest.name}](../../sources/${manifest.id}/overview.md)
`;
}

function queryPage(manifest, notes) {
  const q = manifest.query;
  return `# \`${manifest.id} query\`

## Synopsis

\`\`\`text
bulk ${manifest.id} query [keys...] [options]
\`\`\`

${q.description}

Keys come from the command line and \`--from FILE\`; each is normalised, invalid ones are reported and
skipped, and ${q.batchSize > 1 ? `${q.batchSize} keys go in one request` : "each key is one request"}.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as \`null\`, an error is not cached.

## Arguments

| Argument | Required | Description |
| --- | --- | --- |
| \`keys...\` | No | ${q.keyLabel}s to look up; \`--from FILE\` reads more. |

## Options

${table(q.options)}

Common query options:

${table(QUERY_COMMON)}
${COMMON_FOOTER.join("\n")}

## Output

The table columns are ${q.columns.map((c) => `\`${c.header ?? c.key}\``).join(", ")}; \`--format json\`
emits \`{ plugin, total, found, skipped, results }\` with the full record per key.

${NOTES_START}
${notes}
${NOTES_END}

## Examples

${examples(q.examples)}

## Exit codes

| Code | Meaning |
| --- | --- |
| \`0\` | At least one key was found. |
| \`1\` | Nothing valid to look up, or an invocation error. |
| \`2\` | No key was found. |
| \`130\` | Interrupted. |

## Related

- [${manifest.name}](../../sources/${manifest.id}/overview.md)
- [Access research](../../sources/${manifest.id}/access.md)
`;
}

let stale = 0;
for (const { manifest } of PLUGINS) {
  const dir = path.join(root, "docs", "commands", manifest.id);
  fs.mkdirSync(dir, { recursive: true });
  const pages = [];
  if (manifest.fetch) pages.push(["fetch.md", fetchPage], ["list.md", listPage]);
  if (manifest.query) pages.push(["query.md", queryPage]);
  for (const [name, render] of pages) {
    const file = path.join(dir, name);
    const text = await prettier.format(render(manifest, existingNotes(file)), {
      ...(await prettier.resolveConfig(file)),
      filepath: file,
    });
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf-8") !== text) {
        stale++;
        process.stderr.write(`stale: ${path.relative(root, file)}\n`);
      }
    } else fs.writeFileSync(file, text, "utf-8");
  }
}
if (check && stale) {
  process.stderr.write(`${stale} page(s) out of date — run node scripts/docs-commands.mjs\n`);
  process.exit(1);
}
