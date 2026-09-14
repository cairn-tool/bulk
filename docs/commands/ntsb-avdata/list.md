# `ntsb-avdata list`

## Synopsis

```text
bulk ntsb-avdata list [options]
```

Enumerates the catalogue with the same selection options as [`ntsb-avdata fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`name`, `listed_date`, `bytes`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option          | Default | Description                                    |
| --------------- | ------- | ---------------------------------------------- |
| `--only <name>` | —       | Only this listed file (avall.zip); repeatable. |
| `--monthly`     | `false` | Only the upNNMMM.zip monthly deltas.           |

Common list options:

| Option               | Default   | Description                                            |
| -------------------- | --------- | ------------------------------------------------------ |
| `--delay <s>`        | —         | Seconds between catalogue requests.                    |
| `--limit <n>`        | —         | Stop after N rows (default: all).                      |
| `--list-file <file>` | —         | Use a saved catalogue response instead of fetching it. |
| `--tsv <file>`       | —         | Write the rows to this TSV instead of printing them.   |
| `--dest <dir>`       | temporary | Keep the catalogue snapshot in this directory.         |
| `--format <fmt>`     | `llm`     | `llm`, `human`, or `json`.                             |
| `--envelope`         | `false`   | Wrap `--format json` output in the result envelope.    |
| `--quiet`            | `false`   | No progress lines on stderr.                           |
| `-h`, `--help`       | —         | Show help.                                             |

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntsb-avdata list        # everything listed
bulk ntsb-avdata list --only avall.zip                     # the current full database
bulk ntsb-avdata list --monthly                            # the twelve upNNMMM.zip deltas
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ntsb-avdata fetch`](fetch.md)
- [NTSB aviation database dumps](../../sources/ntsb-avdata/overview.md)
