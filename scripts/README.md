# Plugin scripts

The scripts for the [agent plugin](../docs/plugins.md) under [`plugins/`](../plugins): one
install script per host, the check CI runs, and the publisher. Each install script is a thin
wrapper over `cairn agent install` — the destinations come from cairn's target profiles, not from
these scripts. `cairn` must be on `PATH` (`npm install -g @cairn-tool/cairn`).

`docs-commands.mjs` and `skill-sources.mjs` are unrelated to installing: they regenerate the
command pages and the skill's source list from the plugin manifests, and `npm test` runs their
`--check` modes.

| Script                   | Host        | Default destination                   |
| ------------------------ | ----------- | ------------------------------------- |
| `install-claude-code.sh` | Claude Code | `~/.claude/plugins/marketplaces/bulk` |
| `install-cursor.sh`      | Cursor      | `~/.cursor/plugins/local/bulk`        |
| `install-antigravity.sh` | Antigravity | `~/.gemini/config/plugins/bulk`       |
| `install-codex.sh`       | Codex       | `$CODEX_HOME/marketplaces/bulk`       |
| `install-opencode.sh`    | OpenCode    | the current directory (project scope) |

```bash
scripts/install-claude-code.sh              # the marketplace, registered and activated
scripts/install-cursor.sh --dry-run         # plan it without writing
scripts/install-codex.sh                    # installed and enabled through the Codex CLI
scripts/install-codex.sh --scope project --into ~/src/app
scripts/install-opencode.sh --uninstall     # undo
```

`--help` on any of them lists the full flag set.

## What each one does differently

**Claude Code** installs the collection as a marketplace, via
`cairn agent marketplace --install --register`, because that is what `/plugin` lists and what one
`enabledPlugins` block activates. `--no-register` writes it without editing
`~/.claude/settings.json`; the exact edit is then reported as `AB805`.

**Cursor** and **Antigravity** get a `plugin-dir` install. Both hosts scan their plugin
directory, so there is nothing to register — restart the host.

**Codex** writes one local marketplace under `$CODEX_HOME/marketplaces/bulk` (falling back to
`~/.codex/marketplaces/bulk`), registers that root with `codex plugin marketplace add`, and
installs and enables the entry with `codex plugin add`. `--no-register` writes only the source
and reports the native commands as `AB805`. `--scope project` is a direct repository merge.

**OpenCode** has no user-scope destination. Its global layout drops the `.opencode/` prefix,
which an install root override cannot express, so its script installs into a project directory —
the current one, or `--into <dir>`.

## Which cairn runs

`cairn` on `PATH`. This repository holds a bundle, not cairn, so nothing is built from the
checkout; `lib/common.sh` is the same file the cairn repository ships, where the local-build
preference is opt-in through `CAIRN_LOCAL_BUILD` for exactly this reason.

| Variable    | Effect                                               |
| ----------- | ---------------------------------------------------- |
| `CAIRN_BIN` | Use this invocation instead, e.g. `CAIRN_BIN=cairn`. |
| `NO_COLOR`  | Plain output.                                        |

Where the bundle lives and what the marketplace is called are read from
`agent-marketplace.yaml` rather than assumed, and the repository root is found by walking up
for that file.

## Publishing

`publish-release-branch.sh <version>` commits a built release tree onto the `release` branch and
moves the `release-v<version>` tag. It is called from `.github/workflows/plugins.yml`, after
`cairn agent marketplace --layout release`, and is the same file the cairn repository uses.

The commit is a **fast-forward, never a force push**. Claude Code's background refresh runs
`git pull` inside each user's clone of that branch, so a rewritten history breaks the update path
for every existing install. The tag moves with `--force`; the branch never does.

| Variable            | Effect                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `RELEASE_DIR`       | The built tree to publish. Defaults to `build/release`.                       |
| `RELEASE_REMOTE`    | Push here instead — how the script is exercised against a scratch repository. |
| `GITHUB_TOKEN`      | Required unless `RELEASE_REMOTE` is set; authenticates the remote inline.     |
| `GITHUB_REPOSITORY` | Required unless `RELEASE_REMOTE` is set.                                      |

## Undoing an install

`--uninstall` on the same script, with the same `--into` and `--scope`. It removes exactly the
inventory recorded in the destination's `.cairn-install.json` and nothing else. `cairn agent
installed` lists what is currently in place.

## Checking every target

`check-bundles.sh` is the check `ci.yml` runs, and it runs locally unchanged:

```bash
scripts/check-bundles.sh                      # 5 targets x 5 commands
scripts/check-bundles.sh cursor opencode      # just those hosts
scripts/check-bundles.sh --strict             # require zero findings everywhere
```

It gates on the diagnostics rather than the exit code: `agent validate` and `agent convert`
fail on any `approximate` diagnostic, and hosts other than Claude Code may carry warnings that
are properties of the host rather than defects in the bundle. Claude Code is held to the exit-0
bar; the rest fail only on `error` diagnostics. This bundle currently renders with zero warnings
everywhere.
