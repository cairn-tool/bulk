# `archive-wayback list`

## Synopsis

```text
bulk archive-wayback list [options]
```

Enumerates the catalogue with the same selection options as [`archive-wayback fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`timestamp`, `mimetype`, `length`, `original`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                 | Default | Description                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `--url <url>`          | —       | A URL or pattern; repeatable.                                                                      |
| `--urls-from <file>`   | —       | URLs from a file, one per line.                                                                    |
| `--match <type>`       | —       | CDX match type for a pattern (prefix for 'host.com*'). One of `exact`, `prefix`, `host`, `domain`. |
| `--mimetype <type>`    | —       | Only captures of this MIME type (application/pdf).                                                 |
| `--status <code>`      | `200`   | Only captures with this status ('' for any).                                                       |
| `--since <yyyy-mm-dd>` | —       | Captures on or after.                                                                              |
| `--until <yyyy-mm-dd>` | —       | Captures on or before.                                                                             |
| `--all-captures`       | `false` | Every distinct capture, not just the newest per URL.                                               |
| `--cdx-limit <n>`      | `0`     | Cap the CDX rows per URL.                                                                          |

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
bulk archive-wayback list --url 'pcisig.com*' --match prefix --mimetype application/pdf
bulk archive-wayback list --url https://www.intel.com/some/doc.pdf
bulk archive-wayback list --urls-from urls.txt --since 2006-01-01 --until 2010-12-31
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`archive-wayback fetch`](fetch.md)
- [Wayback Machine](../../sources/archive-wayback/overview.md)
