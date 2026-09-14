# `cern-yellowreports fetch`

## Synopsis

```text
bulk cern-yellowreports fetch [options]
```

Pull CERN Yellow Report articles into <dest>/<report number>/<article DOI tail> - <title>.pdf.

Catalogue: the OJS OAI-PMH feed (saved page by page under _oai/), every article with its DOI,
the issue's report number (CERN-2015-001), authors, date and galley PDF URL. Files are the
galley downloads, verified as PDF. --from/--until filter by the OAI datestamp; --report takes
one report number (issue).

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.cern-yellowreports.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_oai/page1.xml`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option                     | Default | Description                            |
| -------------------------- | ------- | -------------------------------------- |
| `--report <CERN-YYYY-NNN>` | —       | One report number (issue); repeatable. |
| `--from <yyyy-mm-dd>`      | —       | OAI datestamp on or after.             |
| `--until <yyyy-mm-dd>`     | —       | OAI datestamp on or before.            |

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

Under the destination: `_oai/page1.xml` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `report_number`, `doi`, `title`, `authors`, `date`, `article`, `galley`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk cern-yellowreports fetch --report CERN-2015-001 --dest ~/archive/cern/yellow
bulk cern-yellowreports fetch --from 2024-01-01 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`cern-yellowreports list`](list.md) — the catalogue, without downloading.
- [CERN Yellow Reports](../../sources/cern-yellowreports/overview.md) — what the source publishes.
- [Access research](../../sources/cern-yellowreports/access.md) — how the source is reached, and what fails.
