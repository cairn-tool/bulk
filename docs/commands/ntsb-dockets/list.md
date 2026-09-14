# `ntsb-dockets list`

## Synopsis

```text
bulk ntsb-dockets list [options]
```

Enumerates the catalogue with the same selection options as [`ntsb-dockets fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`ntsb_number`, `project_id`, `date`, `type`, `city_state`, `description`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                 | Default | Description                                                                                                    |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `--ntsb-number <id>`   | —       | This docket (DCA96MA070); repeatable.                                                                          |
| `--project <n>`        | —       | This docket by ProjectID; repeatable.                                                                          |
| `--office <prefix>`    | —       | Dockets whose NTSB number starts with this office code (DCA, CEN, …); repeatable.                              |
| `--mode <mode>`        | —       | Only this mode; repeatable. One of `Aviation`, `Marine`, `Highway`, `Rail`, `Pipeline`, `Hazmat`, `Non-Modal`. |
| `--since <yyyy-mm-dd>` | —       | Accident date on or after.                                                                                     |
| `--until <yyyy-mm-dd>` | —       | Accident date on or before.                                                                                    |
| `--pdf-only`           | `false` | Take only the PDF items, not data, media or images.                                                            |

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
bulk ntsb-dockets list --ntsb-number DCA96MA070    # TWA 800, 3,412 items
bulk ntsb-dockets list --ntsb-number DCA96MA068 --pdf-only                        # Delta 1288, PDFs only
bulk ntsb-dockets list --office DCA --mode Aviation --since 2015-01-01
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`ntsb-dockets fetch`](fetch.md)
- [NTSB Docket Management System](../../sources/ntsb-dockets/overview.md)
