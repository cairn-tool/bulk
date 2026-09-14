# `ntsb-carol list`

## Synopsis

```text
bulk ntsb-carol list [options]
```

Enumerates the catalogue with the same selection options as [`ntsb-carol fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`period`, `count`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option               | Default | Description                                                                 |
| -------------------- | ------- | --------------------------------------------------------------------------- |
| `--year <yyyy>`      | —       | This event year; repeatable.                                                |
| `--from-year <yyyy>` | —       | First year (default 1948).                                                  |
| `--to-year <yyyy>`   | —       | Last year (default: this year).                                             |
| `--export <what>`    | `both`  | What to export. One of `data`, `summary`, `both`.                           |
| `--reports`          | `false` | Also pull each aviation case's generated report PDF (from the summary CSV). |
| `--refresh`          | `false` | Re-export years already present.                                            |

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
bulk ntsb-carol list                # every year, 1948 to now, data and summary
bulk ntsb-carol list --year 2019 --year 2020
bulk ntsb-carol list --from-year 2024 --refresh                 # redo the years still changing
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ntsb-carol fetch`](fetch.md)
- [NTSB CAROL case database](../../sources/ntsb-carol/overview.md)
