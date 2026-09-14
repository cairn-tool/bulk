# `noaa-ir list`

## Synopsis

```text
bulk noaa-ir list [options]
```

Enumerates the catalogue with the same selection options as [`noaa-ir fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`pid`, `year`, `type`, `bytes`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                 | Default | Description                                                                                                |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `--collection <pid>`   | —       | Collection id (1 NEPA, 3 CRCP, 4 OER, 5 NMFS, 6 NWS, 7 OAR, 8 NOS, 9 NESDIS, …); repeatable. **Required.** |
| `--type <type>`        | —       | Resource type (Journal Article, Technical Memorandum, Report, …); repeatable.                              |
| `--from <yyyy-mm-dd>`  | —       | Items added to the repository on or after.                                                                 |
| `--until <yyyy-mm-dd>` | —       | Items added on or before.                                                                                  |

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
bulk noaa-ir list --collection 6                                  # NWS: what is there
bulk noaa-ir list --collection 6 --type "Technical Memorandum"
bulk noaa-ir list --collection 9 --from 2025-01-01    # NESDIS, added this year
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`noaa-ir fetch`](fetch.md)
- [NOAA Institutional Repository](../../sources/noaa-ir/overview.md)
