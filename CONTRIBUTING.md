# Contributing to bulk

`bulk` is a CLI meant to be run by agents and scripts as much as by people, so most of its rules
exist to keep machine-readable output stable and downloads honest.

## Setup

```bash
git clone git@github.com:cairn-tool/bulk.git
cd bulk
npm ci
npm test        # builds dist/ via `pretest`, then runs the suites
```

Node must satisfy `engines` in `package.json`. `.nvmrc` names the version CI uses.

## Before opening a pull request

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
```

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) are **required**. semantic-release
derives the version from them, and both a `commit-msg` hook and a CI job reject malformed messages.

| Prefix                           | Effect        |
| -------------------------------- | ------------- |
| `fix:` / `perf:`                 | patch release |
| `feat:`                          | minor release |
| `feat!:` or `BREAKING CHANGE:`   | major release |
| `chore:` `docs:` `test:` `ci:` … | no release    |

## Adding a plugin

One plugin is one data system. See [docs/guide/writing-a-plugin.md](docs/guide/writing-a-plugin.md):
a `src/plugins/<id>/manifest.ts` (data only), an `index.ts` engine, a `parse.ts` with fixture-tested
parsers, an entry in `src/plugins/index.ts`, fixtures under `tests/fixtures/sources/<host>/`, an
integration test, and `docs/sources/<id>/{overview,access}.md` plus the command pages. The guard tests
name whatever is missing.

## Things that will surprise you

- **No test opens a network socket beyond 127.0.0.1.** Plugins are exercised against
  `tests/helpers/source-server.ts`, which serves fixture responses per host.
- **The e2e suite spawns the compiled CLI** (`dist/cli.js`); `npm test` builds first.
- **ESM only.** Relative imports carry the `.js` extension.
- **Never hand-edit `version` in `package.json` or `CHANGELOG.md`.** semantic-release owns both.
- **Every `--format json` payload goes through `jsonPayload`** in `src/result.ts`.
- **Sort by byte comparison, never `localeCompare`.**
