# `cern-cds list`

## Synopsis

```text
bulk cern-cds list [options]
```

Enumerates the catalogue with the same selection options as [`cern-cds fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`record`, `report_number`, `source`, `bytes`, `dest`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                 | Default | Description                                                                                |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `--set <set>`          | —       | OAI-PMH set (cerncds:BOOK, cerncds:REPORT, cerncds:FULLTEXT, cerncds:SCAN, …); repeatable. |
| `--from <yyyy-mm-dd>`  | —       | With --set: records changed on or after.                                                   |
| `--until <yyyy-mm-dd>` | —       | With --set: records changed on or before.                                                  |
| `--query <pattern>`    | —       | Invenio search pattern for /search?of=xm (reportnumber:CERN-2004-003*, author:ellis).      |
| `--record <id>`        | —       | A CDS record id; repeatable.                                                               |
| `--no-anubis`          | `false` | Do not solve the Anubis challenge; take files from INSPIRE instead of CDS.                 |
| `--no-inspire`         | `false` | With --no-anubis: do not fall back to INSPIRE either.                                      |
| `--all-formats`        | `false` | Include the derivative files (icons, PDF/A) CDS lists with ?subformat=.                    |

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
bulk cern-cds list --set cerncds:BOOK --from 2026-01-01
bulk cern-cds list --set cerncds:REPORT --from 2026-06-01
bulk cern-cds list --query "reportnumber:CERN-2004-003*"     # the documented search API
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`cern-cds fetch`](fetch.md)
- [CERN Document Server](../../sources/cern-cds/overview.md)
