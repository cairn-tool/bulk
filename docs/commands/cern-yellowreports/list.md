# `cern-yellowreports list`

## Synopsis

```text
bulk cern-yellowreports list [options]
```

Enumerates the catalogue with the same selection options as [`cern-yellowreports fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`report_number`, `date`, `title`, `authors`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                     | Default | Description                            |
| -------------------------- | ------- | -------------------------------------- |
| `--report <CERN-YYYY-NNN>` | —       | One report number (issue); repeatable. |
| `--from <yyyy-mm-dd>`      | —       | OAI datestamp on or after.             |
| `--until <yyyy-mm-dd>`     | —       | OAI datestamp on or before.            |

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
bulk cern-yellowreports list
bulk cern-yellowreports list --report CERN-2015-001
bulk cern-yellowreports list --from 2024-01-01
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`cern-yellowreports fetch`](fetch.md)
- [CERN Yellow Reports](../../sources/cern-yellowreports/overview.md)
