# Writing a plugin

One plugin is one data system: a catalogue that can be enumerated and pulled (`fetch` and
`list`), a lookup that turns identifiers into records (`query`), or both. Adding one is adding a
directory under `src/plugins/` and the pages that describe it; the guard tests name whatever is
missing.

## Before the code: the research

Write `docs/sources/<id>/access.md` first, by making the requests. It must establish every entry
point and its mechanism; how the catalogue is enumerated, its paging and caps; the file endpoint's
failure modes, found by sending it wrong input; `robots.txt` on every host touched; the User-Agent
each host accepts; whether the source is mutable and what field signals a change; and a table of
every request made. The [standards](../standards.md#fetch) say why.

## The files

```text
src/plugins/<id>/
├── manifest.ts   the declaration: id, name, summary, hosts, fetch and/or query — data only
├── index.ts      the engine: `plan()` for fetch, `lookup()` for query; exports `plugin`
└── parse.ts      the pure parsers, tested against fixture bodies
tests/fixtures/sources/<host>/
├── routes.json   what the fixture server answers
├── README.md     where the fixtures came from and when
└── …             trimmed real responses, or hand-written ones in the real shape
tests/unit/plugins/<id>-parse.test.ts
tests/integration/…              plan + run against the fixture server
docs/sources/<id>/overview.md    purpose, scope, types of data, the commands
docs/sources/<id>/access.md      the research
docs/commands/<id>/*.md          generated: node scripts/docs-commands.mjs
```

Then one line in `src/plugins/index.ts`:

```ts
{ manifest: myPlugin, load: async () => (await import("./my-plugin/index.js")).plugin },
```

## The manifest

`manifest.ts` imports nothing but types. It is read at startup by every invocation — to build the
command tree, `describe`, completion — so it must stay cheap, and it is what the docs generator and
the contract registry read.

```ts
export const manifest: PluginManifest = {
  id: "my-source",
  name: "My Source",
  summary: "one line for `bulk sources`",
  hosts: [{ host: "api.example.org", userAgent: "browser", minInterval: 1, note: "…" }],
  fetch: {
    description: "the --help text",
    examples: ["bulk my-source fetch --dest ~/archive/x"],
    options: [{ kind: "string", name: "series", value: "x", description: "…", repeatable: true }],
    manifestColumns: ["dest", "url", "bytes", "id", "title"],
    listColumns: [{ key: "id", width: 12 }, { key: "title" }],
    catalogueFile: "_catalogue.json",
    selectionRequired: true,
  },
  query: {
    keyLabel: "identifier",
    description: "…",
    examples: ["bulk my-source query ABC123"],
    options: [],
    batchSize: 1,
    columns: [{ key: "identifier" }, { key: "title" }],
  },
};
```

An `OptionDecl` drives everything about an option — commander registration, validation, `describe`,
completion, the docs table. Option names must not shadow the common ones (`dest`, `delay`,
`limit`, `list-file`, `dry-run`, `tsv`, `from`, `cache`, `no-cache`, `refresh`, `format`,
`envelope`, `quiet`); the manifest test checks.

A `HostPolicy` says what each host needs: `userAgent` (`browser`, `curl`, or `polite`),
`minInterval` for a host that publishes no rate-limit headers, `challenge` when a solver's cookie
must be sent.

## The engine

`plan(ctx, opts)` enumerates the catalogue with `ctx.http`, saves it raw in `ctx.dest` (the
`catalogueFile`), honours `ctx.listFile` (read the saved response instead of fetching), and
returns items:

```ts
{ dest: "Series/ID - Title.pdf", url, bytes, digest?: { algorithm: "sha1", value }, fallbacks?, request?, extra: { …manifest columns, list_id } }
```

Use `cleanTitle` and `safeName` from `src/pull/naming.js` for names, `dedupeDests` for collisions,
and `byteCompare` for order. Report progress through `ctx.log.info`; put per-item progress through
a `Progress` on `ctx.stream` when the plan itself is slow (one request per record). Throw a plain
`Error` for a refused selection or a catalogue that will not parse — that is exit `1`, before
anything is pulled. `postRun` is for the rare second step (unzip an export, a second pass).

`lookup(keys, ctx, opts)` returns `{ [key]: record | null }`; `normalize(raw)` returns the
canonical key or `null` for an invalid one; `describe(record)` is the right-margin outcome;
`columns(opts)` and `details(key, record, opts)` serve options that change the table or add lines.

## Fixtures and tests

Fixtures live under `tests/fixtures/sources/<host>/` with a `routes.json` the fixture server
reads: a path (and optional query, body substring, cookie requirement) to a file, a status, headers,
or a per-call sequence. Prefer trimmed real responses — three to five records, the fields the
parser reads — and say so in the host's `README.md`; hand-write only what cannot be captured
(a challenge page at difficulty 1, a 0-byte 200).

Test the parsers as units over the fixture bodies, and the whole plugin in an integration test
through `PluginHarness` (`tests/helpers/plugin-harness.ts`): plan, run, the files and log that
result, and a second run that skips. No test may open a network socket beyond 127.0.0.1.

## Docs

`docs/sources/<id>/overview.md` needs `## Purpose`, `## Scope` and `## Types of data`; the
command pages are generated (`node scripts/docs-commands.mjs`) with a hand-written block kept
between `<!-- notes -->` markers; add the plugin to `docs/_contents.md`, `docs/commands.md` and
`docs/sources.md`. `tests/unit/docs.test.ts` checks all of it.
