# `ntsb-reports fetch`

## Synopsis

```text
bulk ntsb-reports fetch [options]
```

Pull every NTSB investigation report PDF into <dest>/<Mode>/<file stem> - <Title>.pdf.

Source: www.ntsb.gov/investigations/AccidentReports/_api/web/Lists/Reports/items (SharePoint
REST, anonymous). Enumerates the list live and saves it as _reports-list.json, writes
_manifest.tsv, verifies each file (HTTP 200, %PDF- magic, byte count against the list), logs
every transfer with its SHA-256 to _download-log.tsv, and skips files already present at their
listed size, so re-running the same command resumes or retries.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ntsb-reports.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_reports-list.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option          | Default | Description                                                                                           |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `--mode <MODE>` | —       | Only this mode, repeatable. One of `Aviation`, `Marine`, `Highway`, `Railroad`, `Pipeline`, `Hazmat`. |

Common fetch options:

| Option               | Default | Description                                                      |
| -------------------- | ------- | ---------------------------------------------------------------- |
| `--dest <dir>`       | —       | Download root (required unless plugins.<id>.dest is configured). |
| `--delay <s>`        | —       | Seconds between downloads (default from config, 2).              |
| `--limit <n>`        | —       | Stop after N items (default: all).                               |
| `--list-file <file>` | —       | Use a saved catalogue response instead of fetching it.           |
| `--dry-run`          | `false` | Build the manifest and print the plan; download nothing.         |
| `--format <fmt>`     | `llm`   | `llm`, `human`, or `json`.                                       |
| `--envelope`         | `false` | Wrap `--format json` output in the result envelope.              |
| `--quiet`            | `false` | No progress lines on stderr.                                     |
| `-h`, `--help`       | —       | Show help.                                                       |

## Files written

Under the destination: `_reports-list.json` (the raw catalogue), `_manifest.tsv` with the columns
`mode`, `dest`, `url`, `bytes`, `stem`, `report_number`, `modes`, `accident_id`, `mkey`, `adopted`, `accident_date`, `title`, `modified`, `list_id`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntsb-reports fetch --dest ~/archive/ntsb/reports
bulk ntsb-reports fetch --mode Aviation --mode Marine
bulk ntsb-reports fetch --dry-run --limit 20
bulk ntsb-reports fetch --delay 0.5
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ntsb-reports list`](list.md) — the catalogue, without downloading.
- [NTSB investigation reports library](../../sources/ntsb-reports/overview.md) — what the source publishes.
- [Access research](../../sources/ntsb-reports/access.md) — how the source is reached, and what fails.
