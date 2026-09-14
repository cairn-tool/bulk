# `sources`

## Synopsis

```text
bulk sources [options]
```

Lists every registered plugin with its one-line summary, its commands, and the hosts it talks to.
With `--format json` the host policies are published too: the User-Agent kind each host needs, a
declared pacing floor, the bot-challenge solver, and the note recording why.

## Options

| Option           | Default | Description                                         |
| ---------------- | ------- | --------------------------------------------------- |
| `--plugin <id>`  | all     | Only this plugin.                                   |
| `--format <fmt>` | `llm`   | `llm`, `human`, or `json`.                          |
| `--envelope`     | `false` | Wrap `--format json` output in the result envelope. |
| `-h`, `--help`   | —       | Show help.                                          |

## Examples

```bash
bulk sources
bulk sources --plugin cern-cds -fj | jq '.plugins[0].hosts'
```

## Exit codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| `0`  | Listing written.                        |
| `1`  | Unknown plugin, or an invocation error. |

## Related

- [Data sources](../sources.md) — what each source publishes.
