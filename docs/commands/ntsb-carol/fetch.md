# `ntsb-carol fetch`

## Synopsis

```text
bulk ntsb-carol fetch [options]
```

Export the CAROL case database into <dest>/<year>/cases-<year>[-<mm>]-{data,summary}.zip, unzipped
beside the zip (cases-….json / cases-….csv + readme.txt).

`data` is the full case record — vehicles, engines, findings with codes, the CICTT event
sequence, injuries, coordinates, probable cause, the factual, analysis and preliminary
narratives. `summary` is the 45-column CSV the UI exports, whose last two columns are the
docket URL (data.ntsb.gov/Docket?ProjectID=<Mkey>) and the report URL. A year larger than the
10,000-case export cap is taken month by month. Re-running skips years already exported;
--refresh redoes them (the current and previous year change as cases close). With --reports,
the generated report PDF of every aviation case in the year's summary is pulled too, into
<year>/reports/.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ntsb-carol.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_periods.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option               | Default | Description                                                                 |
| -------------------- | ------- | --------------------------------------------------------------------------- |
| `--year <yyyy>`      | —       | This event year; repeatable.                                                |
| `--from-year <yyyy>` | —       | First year (default 1948).                                                  |
| `--to-year <yyyy>`   | —       | Last year (default: this year).                                             |
| `--export <what>`    | `both`  | What to export. One of `data`, `summary`, `both`.                           |
| `--reports`          | `false` | Also pull each aviation case's generated report PDF (from the summary CSV). |
| `--refresh`          | `false` | Re-export years already present.                                            |

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

Under the destination: `_periods.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `year`, `month`, `format`, `count`, `exported`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntsb-carol fetch --dest ~/archive/ntsb/carol                # every year, 1948 to now, data and summary
bulk ntsb-carol fetch --year 2019 --year 2020
bulk ntsb-carol fetch --from-year 2024 --refresh                 # redo the years still changing
bulk ntsb-carol fetch --year 2019 --export summary --reports
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ntsb-carol list`](list.md) — the catalogue, without downloading.
- [NTSB CAROL case database](../../sources/ntsb-carol/overview.md) — what the source publishes.
- [Access research](../../sources/ntsb-carol/access.md) — how the source is reached, and what fails.
