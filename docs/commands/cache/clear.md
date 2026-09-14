# `cache clear`

## Synopsis

```text
bulk cache clear [options]
```

Removes cached challenge cookies: all of them, one solver's (`--solver anubis`), or one host's
(`--host cds.cern.ch`). The next fetch against that host solves the challenge again. Nothing
outside the cache directory is touched.

## Options

| Option            | Default | Description                                         |
| ----------------- | ------- | --------------------------------------------------- |
| `--solver <name>` | all     | Only this solver (`anubis`).                        |
| `--host <host>`   | all     | Only this host.                                     |
| `--format <fmt>`  | `llm`   | `llm`, `human`, or `json`.                          |
| `--envelope`      | `false` | Wrap `--format json` output in the result envelope. |
| `-h`, `--help`    | —       | Show help.                                          |

## Exit codes

| Code | Meaning                       |
| ---- | ----------------------------- |
| `0`  | Cleared, or nothing to clear. |
| `1`  | Invocation error.             |
