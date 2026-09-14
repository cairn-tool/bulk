# `itu-t fetch`

## Synopsis

```text
bulk itu-t fetch [options]
```

Pull ITU-T Recommendations into <dest>/<X>-Series - <name>/ITU-T <number> (<yyyy-mm>) [<component>] - <title>.pdf.

The catalogue is the MyWorkspace API (mws/api/recommendations/searchRecs), one call per
series with an approval-date window, saved as _itut-api.json. Every text is downloaded
through rec/dologin_pub.asp, which serves the public editions without a login; a prepublished
or TIES-only text answers an HTML page instead of a PDF and is logged as such. --main-only
leaves out amendments, corrigenda, errata and supplements.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.itu-t.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_itut-api.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option                         | Default      | Description                                                                     |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| `--series <x>`                 | —            | Series letter; repeatable (default: the 14 series D E F G H I J M Q T V X Y Z). |
| `--approved-from <yyyy-mm-dd>` | `2023-01-01` | Approval date on or after.                                                      |
| `--approved-to <yyyy-mm-dd>`   | `2030-12-31` | Approval date on or before (the API rejects years past ~2030).                  |
| `--main-only`                  | `false`      | Main editions only — no amendments, corrigenda, supplements.                    |

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

Under the destination: `_itut-api.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `series`, `dms_id`, `rec_name`, `title`, `approval_date`, `status`, `idrec`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk itu-t fetch --series G --approved-from 2024-01-01 --dest ~/archive/itu
bulk itu-t fetch --approved-from 2026-01-01 --dry-run          # every held series, this year
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`itu-t list`](list.md) — the catalogue, without downloading.
- [ITU-T Recommendations](../../sources/itu-t/overview.md) — what the source publishes.
- [Access research](../../sources/itu-t/access.md) — how the source is reached, and what fails.
