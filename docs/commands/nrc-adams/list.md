# `nrc-adams list`

## Synopsis

```text
bulk nrc-adams list [options]
```

Enumerates the catalogue with the same selection options as [`nrc-adams fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`accession`, `document_date`, `listed_bytes`, `type`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                | Default | Description                                                       |
| --------------------- | ------- | ----------------------------------------------------------------- |
| `--ml <MLxxxxxxxxx>`  | —       | Accession number; repeatable.                                     |
| `--ml-from <file>`    | —       | Accession numbers from a file, one per line.                      |
| `--q <text>`          | —       | Free-text query.                                                  |
| `--docket <n>`        | —       | Docket number (05000255); repeatable.                             |
| `--type <type>`       | —       | Document type (Inspection Report, NUREG, …); repeatable.          |
| `--added <from> <to>` | —       | Date added to ADAMS, YYYY-MM-DD YYYY-MM-DD.                       |
| `--dated <from> <to>` | —       | Document date, YYYY-MM-DD YYYY-MM-DD.                             |
| `--packages`          | `false` | Also pull the member documents of every package in the selection. |

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
bulk nrc-adams list --ml ML11126A118 --ml ML26237A144 --packages
bulk nrc-adams list --docket 05200001 --type "Design Control Document (DCD)"
bulk nrc-adams list --added 2026-09-01 2026-09-07
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`nrc-adams fetch`](fetch.md)
- [NRC ADAMS public library](../../sources/nrc-adams/overview.md)
