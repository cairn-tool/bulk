# `ietf-rfc list`

## Synopsis

```text
bulk ietf-rfc list [options]
```

Enumerates the catalogue with the same selection options as [`ietf-rfc fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`RFC`, `date`, `status`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                 | Default | Description                                                 |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `--from <n>`           | —       | First RFC number.                                           |
| `--to <n>`             | —       | Last RFC number.                                            |
| `--missing-from <dir>` | —       | Skip numbers a folder already holds as `RFC <n> - …` files. |

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
bulk ietf-rfc list --from 9000 --to 9010
bulk ietf-rfc list --missing-from ~/archive/Standards/IETF
bulk ietf-rfc list --from 9000 --to 9010
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ietf-rfc fetch`](fetch.md)
- [The RFC series (RFC Editor)](../../sources/ietf-rfc/overview.md)
