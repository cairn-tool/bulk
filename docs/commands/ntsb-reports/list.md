# `ntsb-reports list`

## Synopsis

```text
bulk ntsb-reports list [options]
```

Enumerates the catalogue with the same selection options as [`ntsb-reports fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`stem`, `mode`, `adopted`, `bytes`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option          | Default | Description                                                                                           |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `--mode <MODE>` | —       | Only this mode, repeatable. One of `Aviation`, `Marine`, `Highway`, `Railroad`, `Pipeline`, `Hazmat`. |

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
bulk ntsb-reports list
bulk ntsb-reports list --mode Aviation --mode Marine
bulk ntsb-reports list --limit 20
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ntsb-reports fetch`](fetch.md)
- [NTSB investigation reports library](../../sources/ntsb-reports/overview.md)
