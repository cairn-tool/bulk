# bulk

A TypeScript/Node ESM CLI published as `@cairn-tool/bulk`. The binary is `bulk`. It pulls
publisher catalogues into a document archive and looks titles up by identifier, one plugin per
data system: `bulk <plugin> <sub-command>`. A port of a Python tool of the same name; the
Python's behaviour (names, verification, manifest and log formats, cookie jars) is the
compatibility baseline, so an archive filled by it resumes under this tool.

## Layout

```text
src/cli.ts                 commander entry; builds the tree from plugin manifests; every action `await import()`s
src/plugins/index.ts       the STATIC plugin list: { manifest, load } — the only place a plugin is registered
src/plugins/<id>/          manifest.ts (data only), index.ts (the engine), parse.ts (pure parsers)
src/plugin/                the plugin contract: types, OptionDecl → commander/schema/completion, contexts
src/commands/              fetch, list, query (generic runners) + sources, cache, config, describe, schema, completion, update-check
src/http/                  HttpClient over native fetch: redirects + cookie jars, host overrides, UA policy, rate limiter, streaming downloads
src/pull/                  Item, naming, verify, run loop, manifest, transfer log, progress, dry-run, dest
src/query/                 keys, JSON cache, resolve, emit
src/challenge/             Solver base, the Anubis proof-of-work, the registry
src/clients/               HTTP clients shared by more than one plugin (ia, crossref, osti, ntrl, inspire)
src/text/                  tsv, csv, html, xml (streaming record splitter), json-file, bytes
src/config.ts, paths.ts, runtime.ts   config.yml, XDG dirs + BULK_* env, the process singleton
src/contract/              command registry generated from manifests; describe; schemas
src/completion/, update-notifier.ts   cairn ports
scripts/docs-commands.mjs  regenerates docs/commands/<plugin>/*.md from dist manifests
scripts/skill-sources.mjs  regenerates the source list in plugins/bulk/skills/sources/SKILL.md from dist manifests
plugins/bulk/              the agent plugin (a cairn agent bundle): one skill, an icon, render contract tests
agent-marketplace.yaml, cairn-verify.yml   the collection spec CI publishes, and the in-repo dogfood install/verify
scripts/{check-bundles,install-*,publish-release-branch}.sh   cairn's plugin scripts, copied; need `cairn` on PATH
tests/{unit,integration,e2e}, tests/helpers, tests/fixtures/sources/<host>/
docs/                      see docs/_contents.md; docs/guide/writing-a-plugin.md is the plugin checklist
```

Adding a plugin: `src/plugins/<id>/{manifest,index,parse}.ts`, one entry in `src/plugins/index.ts`,
fixtures under `tests/fixtures/sources/<host>/` with `routes.json` and `README.md`, a parse unit
test, an integration test through `PluginHarness`, `docs/sources/<id>/{overview,access}.md`, the
generated `docs/commands/<id>/*.md`, and lines in `docs/_contents.md`, `docs/commands.md`,
`docs/sources.md`. `tests/unit/docs.test.ts` and `tests/unit/plugin-manifests.test.ts` name what is
missing. Everything the contract, `describe`, completion and the docs know about a command comes
from the manifest; there is no second list to update. The agent plugin's skill lists every source
from the same manifests: run `node scripts/skill-sources.mjs` after the build (its `--check` is in
the docs test) and bump the bundle version in `plugins/bulk/agent-bundle.yaml`.

## Conventions

- ESM only; relative imports carry the `.js` extension (`moduleResolution: NodeNext`).
- `--format llm|human|json` everywhere (`-fh`/`-fj` rewritten in `src/cli.ts`); every JSON payload
  goes through `jsonPayload` in `src/result.ts` so `--envelope` reaches it. `--envelope` without
  `--format json` is a usage error even when the format was configured.
- Exit codes: `0`, `1` usage/config/catalogue error (nothing pulled), `2` one or more items failed
  or nothing found, `130` interrupted. Commands throw `CommandExit`; `src/cli.ts` sets
  `process.exitCode`; nothing calls `process.exit()`.
- Config precedence: flag (explicit argv only) > env > `plugins.<id>` > top-level > default.
  Unknown config keys are errors.
- A fetch **requires** a destination (`--dest` or `plugins.<id>.dest`); there is no derived default.
- Progress and status lines go to **stderr**; stdout carries only the result.
- `bulk <plugin> --docs` and `bulk --docs` print pages from `docs/` verbatim, so `docs/commands`,
  `docs/sources`, `docs/guide`, `docs/formats` and `docs/configuration.md` ship in the tarball
  (`package.json` `files`; the packaging test checks). The program's own options are positional
  (`enablePositionalOptions`) so the plugin groups can carry their own `--docs`.
- Sort with byte comparison (`byteCompare`), never `localeCompare`. Names come from `cleanTitle`
  and `safeName`, ported character-for-character from the Python.
- Manifests import only types. `src/cli.ts` statically imports `./plugins/index.js` (manifests)
  and the prelude; command modules and plugin engines load lazily. `tests/unit/cli-imports.test.ts`
  and `tests/e2e/startup.test.ts` enforce it.
- `npm test` builds first (`pretest`); e2e spawns `dist/cli.js`, and the docs test runs
  `scripts/docs-commands.mjs --check` against `dist/`. Commit messages are conventional commits
  (commitlint).

## Gotchas

- **HTTP 200 is not success.** NTSB `docBLOB` and NTRL's download return 0-byte 200s; ITU-T
  returns a TIES login page as 200; Cloudflare and viewer interstitials are HTML where a PDF was
  expected. `src/pull/verify.ts` checks status → non-empty → magic → size → digest, in that order,
  and every failure removes the `.part`. Keep that order.
- **Options must not shadow the common ones.** archive-items' file format flag is `--file-format`
  (commander rejected a second `--format`); ntsb-carol's Python `--format` is `--export`;
  archive-wayback's list is `--urls-from`; nrc-adams' is `--ml-from`. The manifest guard test
  checks the reserved names.
- **arXiv:** one API request per 3 s is a declared floor on `export.arxiv.org`; a 429 has no
  `Retry-After` and the block held >20 min in testing, so it is fatal with a message, not retried.
- **NOAA IR and NRC ADAMS** (Akamai) deny the browser UA and serve `curl/8.x`; NOAA needs
  `Accept: */*` (`application/json` is a 406). NRC search: `q: ""`, `filters` required, no sort;
  `DocumentSize` is not the served size — magic only.
- **Crossref** polite pool needs `mailto:` from config `contact`; its `x-rate-limit-*` headers
  drive the limiter. NIST `query` goes through Crossref (`10.6028/<designation>`).
- **NTRL JSF:** re-read `javax.faces.ViewState` from every response; page 1 is a GET, later pages
  a PrimeFaces POST; detail labels carry a trailing colon the parser strips.
- **NIST `allrecords-MODS.xml`** is ~84 MB: `xmlRecords` streams and splits on record boundaries;
  never DOM it. MARCXML is namespaced from `/oai2d` and bare from `/search?of=xm`;
  `fast-xml-parser` with `removeNSPrefix` unifies them, and `datafield` may be a single object.
- **ITU-R** pages are Windows-1252 (`TextDecoder("windows-1252")`); the `_pages/` cache stores raw
  bytes. The fixture pages are padded past 1000 bytes because a cached page under that size is refetched.
- **CAROL** summary CSVs carry a BOM; `ReportUrl` is the last column and may be quoted.
- **Wayback CDX:** a trailing `*` on `url` together with `matchType` matches nothing — strip one.
  A missing IA item is a 200 `{}`.
- **Anubis** (cds.cern.ch): JWT ~1 h, refreshed within `challenge.anubis.refreshMargin`, sent on
  every request to the host; `/oai2d` is not gated. Jars are Netscape format at
  `<cache>/anubis/<host>.jar`, the Python tool's path, so existing jars are reused.
- **Inline digest verification** replaces the Python's post-run sha1/sha256 sweep: the log row
  reads `fail sha1 mismatch` rather than ok-then-removed.
- **TSV cells:** `\t`, `\r`, `\n` become a space (the Python did not escape); `writeTsv` takes
  `RowLike = object`.
- **Fixture sizes:** the `pdf(n)` helper produces n+22 bytes; catalogue byte counts in fixtures
  must match that, or the size check fails the item. Route paths with spaces are matched after
  `decodeURIComponent`.
- **Floats in tests:** the limiter's sleeps are computed; use `toBeCloseTo`, not `toEqual`.
- **ISBN check digits:** `9780000000002` is a valid ISBN-13; invalid-key tests use `…003`.
- **SIGINT:** abort the shared controller, finish the current item's cleanup, restore the
  terminal in `finally`, print the summary, exit 130; a second SIGINT exits immediately.
- Lint rules that bit during the port: `preserve-caught-error` (rethrow with `{ cause }`),
  `no-useless-assignment`, `no-regex-spaces`.

## Not in scope

File hashing, PDF text/OCR, Office conversion (the Python tool's `hash/`, `ocr/`, `convert/`) and
the MCP server were deliberately left out; `docs/future-enhancements.md` records them.
