# `check-update`

## Synopsis

```text
bulk check-update [options]
```

Queries the configured npm registry for the latest published version and compares it with the
installed one. Always asks the registry — an explicit request is never answered from the
[passive notice's](../update-checks.md) cache — and refreshes that cache so the notice stays
consistent. The query goes through `npm view`, so a mirror or proxy configured in `.npmrc` is
honoured.

## Options

| Option           | Default | Description                                         |
| ---------------- | ------- | --------------------------------------------------- |
| `--format <fmt>` | `llm`   | `llm`, `human`, or `json`.                          |
| `--envelope`     | `false` | Wrap `--format json` output in the result envelope. |
| `-h`, `--help`   | —       | Show help.                                          |

## Exit codes

| Code | Meaning                               |
| ---- | ------------------------------------- |
| `0`  | Up to date.                           |
| `1`  | Could not resolve the latest version. |
| `2`  | A newer version is published.         |
