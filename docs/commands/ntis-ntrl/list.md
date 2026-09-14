# `ntis-ntrl list`

## Synopsis

```text
bulk ntis-ntrl list [options]
```

Enumerates the catalogue with the same selection options as [`ntis-ntrl fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`accession`, `year`, `source`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option              | Default  | Description                                                                                                |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `--query <words>`   | —        | NTRL's own search over the whole record.                                                                   |
| `--accession <acc>` | —        | An NTIS accession number (ADA130537, PB2021100329, ORNLTM3177); repeatable.                                |
| `--source <where>`  | `agency` | Where to look for the document (NTRL's own action returns an empty body). One of `agency`, `ntrl`, `both`. |
| `--records-only`    | `false`  | Harvest the records and look for no documents.                                                             |

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
bulk ntis-ntrl list --accession ORNLTM3177 --accession ORNL5011
bulk ntis-ntrl list --query "molten salt reactor" --limit 25
bulk ntis-ntrl list --query "radar cross section"
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ntis-ntrl fetch`](fetch.md)
- [National Technical Reports Library (NTIS)](../../sources/ntis-ntrl/overview.md)
