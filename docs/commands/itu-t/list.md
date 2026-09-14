# `itu-t list`

## Synopsis

```text
bulk itu-t list [options]
```

Enumerates the catalogue with the same selection options as [`itu-t fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`dms_id`, `approval_date`, `status`, `rec_name`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                         | Default      | Description                                                                     |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| `--series <x>`                 | —            | Series letter; repeatable (default: the 14 series D E F G H I J M Q T V X Y Z). |
| `--approved-from <yyyy-mm-dd>` | `2023-01-01` | Approval date on or after.                                                      |
| `--approved-to <yyyy-mm-dd>`   | `2030-12-31` | Approval date on or before (the API rejects years past ~2030).                  |
| `--main-only`                  | `false`      | Main editions only — no amendments, corrigenda, supplements.                    |

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
bulk itu-t list --series G --approved-from 2024-01-01
bulk itu-t list --approved-from 2026-01-01          # every held series, this year
bulk itu-t list --series Y --main-only
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`itu-t fetch`](fetch.md)
- [ITU-T Recommendations](../../sources/itu-t/overview.md)
