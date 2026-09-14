# `itu-r list`

## Synopsis

```text
bulk itu-r list [options]
```

Enumerates the catalogue with the same selection options as [`itu-r fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`edition_id`, `date`, `status`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option              | Default | Description                                                                              |
| ------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `--series <xx>`     | —       | Series (BO, BS, BT, F, M, SF, P, S, SM, …); repeatable; default the six BO BS BT F M SF. |
| `--since <yyyy-mm>` | —       | Editions dated on or after.                                                              |
| `--status <which>`  | `all`   | Edition status. One of `in-force`, `superseded`, `all`.                                  |

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
bulk itu-r list --series M --since 2023-01
bulk itu-r list --since 2026-01                # every held series
bulk itu-r list --series BT --status in-force
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`itu-r fetch`](fetch.md)
- [ITU-R Recommendations](../../sources/itu-r/overview.md)
