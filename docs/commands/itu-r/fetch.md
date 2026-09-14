# `itu-r fetch`

## Synopsis

```text
bulk itu-r fetch [options]
```

Pull ITU-R Recommendations into <dest>/<XX>-Series - <name>/ITU-R <rec>-<n> (<yyyy-mm>) - <title>.pdf.

There is no API: the series page (rec/R-REC-<XX>/en) lists the Recommendations and each
Recommendation's page lists every edition with its id, date, title and status. Pages are
cached under _pages/, so a re-run refetches nothing it has; the editions are written to
_editions.tsv, and the files come from dms_pubrec/itu-r/rec/<series>/<edition>!!PDF-E.pdf
for the editions selected by --since and --status.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.itu-r.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_editions.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option              | Default | Description                                                                              |
| ------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `--series <xx>`     | —       | Series (BO, BS, BT, F, M, SF, P, S, SM, …); repeatable; default the six BO BS BT F M SF. |
| `--since <yyyy-mm>` | —       | Editions dated on or after.                                                              |
| `--status <which>`  | `all`   | Edition status. One of `in-force`, `superseded`, `all`.                                  |

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

Under the destination: `_editions.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `series`, `rec`, `edition_id`, `date`, `title`, `status`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk itu-r fetch --series M --since 2023-01 --dest ~/archive/itu-r
bulk itu-r fetch --since 2026-01 --dry-run                # every held series
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`itu-r list`](list.md) — the catalogue, without downloading.
- [ITU-R Recommendations](../../sources/itu-r/overview.md) — what the source publishes.
- [Access research](../../sources/itu-r/access.md) — how the source is reached, and what fails.
