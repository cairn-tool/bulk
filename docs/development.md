# Development

Building and testing `bulk` itself. Contribution conventions — commit messages, the pre-push
checklist, the checklist for adding a plugin — are in
[CONTRIBUTING.md](https://github.com/cairn-tool/bulk/blob/main/CONTRIBUTING.md).

```bash
git clone git@github.com:cairn-tool/bulk.git
cd bulk
npm ci

npm test           # builds dist/ via `pretest`, then runs the unit, integration and e2e suites
npm run test:watch
npm run build      # tsc -> dist/
npm run lint       # ESLint
npm run format     # Prettier (write); `npm run format:check` in CI
npm run typecheck  # tsc --noEmit

node scripts/docs-commands.mjs   # regenerate docs/commands/<plugin>/*.md from the manifests
node scripts/skill-sources.mjs   # regenerate the source list in the agent plugin's skill
scripts/check-bundles.sh         # check the agent plugin for every host (needs `cairn` on PATH)
```

The [agent plugin](plugins.md) under `plugins/bulk/` is built and installed with the same
scripts CI uses.

## The test suites

| Suite               | Runs against                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit`        | The source modules directly: parsers over fixture bodies, the HTTP client with a scripted `fetch`, the rate limiter with a fake clock, the manifests and contract as guards. |
| `tests/integration` | Whole plugins — `plan()` and the download loop — against `tests/helpers/source-server.ts`, a local HTTP server that stands in for every source host at once.                 |
| `tests/e2e`         | The **compiled** `dist/cli.js`, spawned as a subprocess with `BULK_HOSTS` pointing at the fixture server.                                                                    |

**No test opens a network socket beyond 127.0.0.1.** The fixture server routes each request by
the `x-bulk-host` header the client sets (the host the plugin named, before the override) to
`tests/fixtures/sources/<host>/`, whose `routes.json` describes the answers: bodies from files,
status codes, headers, per-call sequences (a 429 then a 200; a challenge page until the request
carries the cookie), and body or cookie requirements. Every host directory has a `README.md`
naming the fixture's origin and date.

The e2e suite spawns the compiled CLI rather than the source, which is why `pretest` builds first.

## Guard tests

Some tests exist to keep a structural rule true rather than to test behaviour; they name what
is missing when a plugin is added:

- `tests/unit/plugin-manifests.test.ts` — every `src/plugins/*` directory is in `PLUGINS`, every
  manifest imports only types, ids and option names are unique and never shadow a common option,
  and every engine exports what its manifest declares.
- `tests/unit/cli-imports.test.ts` and `tests/e2e/startup.test.ts` — `src/cli.ts` reaches every
  command module and plugin engine through `await import()`, so `--help` loads none of them.
- `tests/e2e/contract.test.ts` — every visible command has a contract row and every row a command;
  `-fj` payloads validate against their published schemas.
- `tests/unit/docs.test.ts` — every plugin has its source pages and a page per sub-command, linked
  from the contents; the generated command pages are in sync with the manifests.

## Related

- [Releasing](releasing.md)
- [Writing a plugin](guide/writing-a-plugin.md)
