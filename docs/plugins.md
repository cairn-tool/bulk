# The agent plugin

`bulk` ships one installable plugin for coding assistants — Claude Code, Codex, Cursor and
Antigravity — so an agent knows the tool exists and what it covers without a human pasting the
docs in. It is authored once as a portable [cairn agent bundle](https://github.com/cairn-tool/cairn)
under [`plugins/bulk/`](https://github.com/cairn-tool/bulk/tree/main/plugins/bulk) and rendered
for every host. **The `bulk` binary is a separate install** — the plugin invokes it, it does not
carry it.

## What is in it

One skill, `sources`, and nothing else — deliberately. A plugin is loaded into every session of
the assistant, so its cost is paid whether or not `bulk` is needed. The skill's description is
the only text always in context; its body loads when the assistant decides the skill applies,
and holds:

- how to check the binary is installed, the command shape, the output formats and the exit codes;
- the working rules — a fetch needs `--dest`, catalogues can be gigabytes, list or `--dry-run`
  first;
- **one line per source**: the plugin id, the same summary `bulk sources` prints, and its
  sub-commands.

Everything else is fetched on demand: the skill tells the assistant to run
[`bulk <plugin> --docs`](commands/common.md#docs) before its first command against a source,
which prints that source's overview, access research and command pages verbatim from `docs/`
(shipped in the package for this). `bulk --docs` prints the shared behaviour, configuration and
guides the same way.

The source list is **generated** from the plugin manifests by `scripts/skill-sources.mjs`, into
the block between `<!-- sources -->` and `<!-- /sources -->`; `tests/unit/docs.test.ts` runs
its `--check` mode, so a plugin added or a summary changed without regenerating fails `npm test`.
The prose around the block is written by hand.

| Skill          | Invocation                  | Sidecars |
| -------------- | --------------------------- | -------- |
| `bulk:sources` | model-invoked, on relevance | none     |

Contract tests in `plugins/bulk/tests/render.test.yaml` pin what every host must render: the
plugin manifest, the skill staying model-invocable, the `--docs` pointer and the source list in
its body, and Cursor's namespacing.

## Installing

Everything is published to the `release` branch, which carries each host's catalog at its own
root path. The marketplace is named `bulk`, and the one plugin in it is `bulk`.

| Host        | Catalog                            | Install from                   |
| ----------- | ---------------------------------- | ------------------------------ |
| Claude Code | `.claude-plugin/marketplace.json`  | the marketplace, or `bundles/` |
| Codex       | `.agents/plugins/marketplace.json` | the marketplace, or `bundles/` |
| Cursor      | `.cursor-plugin/marketplace.json`  | the marketplace, or `bundles/` |
| Antigravity | none                               | `bundles/`                     |

### Claude Code

```text
/plugin marketplace add cairn-tool/bulk@release
/plugin install bulk@bulk
```

### Codex

`--ref` pins the marketplace to the published branch rather than `main`:

```bash
codex plugin marketplace add cairn-tool/bulk --ref release
codex plugin add bulk@bulk
```

`codex plugin marketplace upgrade bulk` re-fetches the catalog after a release — the snapshot
Codex installs from is local and does not update on its own.

### Cursor

A repository-backed marketplace is a **team marketplace** (Teams or Enterprise). In the
dashboard, **Plugins → Team Marketplaces → Add Marketplace → Import from Repo**, point it at
`https://github.com/cairn-tool/bulk` and the `release` branch. Without a team plan, install
locally with `scripts/install-cursor.sh` from a checkout.

### Antigravity

The branch also publishes the **source bundle** under `bundles/`, so a host with no marketplace
concept installs straight off it:

```bash
git clone --branch release https://github.com/cairn-tool/bulk.git
cairn agent install bulk/bundles/bulk --target antigravity --scope user
```

### Pinning

Use the tag rather than the branch: `#release-v1.0.0` for Claude Code, `--ref release-v1.0.0`
for Codex, `--git-ref release-v1.0.0` for Cursor. Pinning also opts out of background auto-update.

## Building and installing from a checkout

The [install scripts](https://github.com/cairn-tool/bulk/tree/main/scripts) wrap
`cairn agent install`; `cairn` must be on `PATH` (`npm install -g @cairn-tool/cairn`).

```bash
scripts/install-claude-code.sh              # one marketplace, registered in ~/.claude/settings.json
scripts/install-claude-code.sh --uninstall  # undo
scripts/check-bundles.sh                    # validate, convert, doctor, test, audit — every host

cairn agent marketplace agent-marketplace.yaml --output ./dist-plugins   # the collection, every target
cairn agent install --config cairn-verify.yml                            # dogfood into this checkout
cairn agent verify  --config cairn-verify.yml
```

`claude plugin validate ~/.claude/plugins/marketplaces/bulk` confirms the install.

## Versions

The bundle's `version` in `plugins/bulk/agent-bundle.yaml` and the collection's in
`agent-marketplace.yaml` are owned by hand and are independent of the CLI's version, which
semantic-release owns. Bump them in the same commit as the content they describe, under a
`chore(plugins):` or `docs(plugins):` prefix — neither cuts a CLI release, and neither needs
to. A regenerated source list that follows a new plugin is a bundle change and gets a bump.

## How it is built and published

1. The `plugins` job in `ci.yml` installs `@cairn-tool/cairn`, runs `scripts/check-bundles.sh`
   for every target, installs the bundle into the checkout and verifies it against
   `cairn-verify.yml`, builds the Claude Code collection under `--strict`, builds the release tree,
   and installs the published source bundle for Antigravity from it.
2. `plugins.yml` runs when `release.yml` completes on `main` (the third link in the
   CI → Release → Plugins chain, so a red matrix cannot reach it). It builds the release tree with
   `--layout release` and `scripts/publish-release-branch.sh` commits it onto the `release`
   branch, tagged `release-v<version>`.
3. The commit is a **fast-forward, never a force push**: Claude Code's background refresh runs
   `git pull` inside each user's clone of that branch, and a rewritten history would break every
   existing install's update path. That is also why the `release` branch must carry no branch
   protection — the workflow pushes it with `GITHUB_TOKEN`.

## Related

- [Shared command behaviour](commands/common.md) — including the `--docs` flag the skill relies on.
- [Releasing](releasing.md) — the CLI's own release pipeline, which this one chains off.
- [Development](development.md)
