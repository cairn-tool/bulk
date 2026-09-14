# `noaa-ir fetch`

## Synopsis

```text
bulk noaa-ir fetch [options]
```

Pull a NOAA IR collection into <dest>/<Collection>/<year>/<PID number> - <title>.pdf.

Catalogue: the JSON API, one call per collection (saved as _noaa-<pid>.json); each item carries
the file's byte count and sha256, both verified as the file streams. Items shared between
collections are pulled once. --from/--until filter by the date the item was added (the API's
own filter), --type by resource type (Journal Article, Technical Memorandum, …).

Collections: 1=NEPA, 3=CRCP, 4=OER, 5=NMFS, 6=NWS, 7=OAR, 8=NOS, 9=NESDIS, 11=Sea Grant, 12=Education and Outreach, 10031=NOAA General Documents, 11879=NOAA International Agreements, 16402=OMAO, 22022=IEA, 23649=Cooperative Institutes, 23702=Weather Research and Forecasting Innovation Act, 24914=Cooperative Science Centers, 44280=Deepwater Horizon.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.noaa-ir.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_noaa-<pid>.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                 | Default | Description                                                                                                |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `--collection <pid>`   | —       | Collection id (1 NEPA, 3 CRCP, 4 OER, 5 NMFS, 6 NWS, 7 OAR, 8 NOS, 9 NESDIS, …); repeatable. **Required.** |
| `--type <type>`        | —       | Resource type (Journal Article, Technical Memorandum, Report, …); repeatable.                              |
| `--from <yyyy-mm-dd>`  | —       | Items added to the repository on or after.                                                                 |
| `--until <yyyy-mm-dd>` | —       | Items added on or before.                                                                                  |

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

Under the destination: `_noaa-<pid>.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `pid`, `collection`, `title`, `year`, `type`, `corp`, `added`, `bytes`, `sha256`, `file_label`, `doi`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk noaa-ir fetch --collection 6 --type "Technical Memorandum" --dest ~/archive/noaa
bulk noaa-ir fetch --collection 9 --from 2025-01-01 --dry-run    # NESDIS, added this year
bulk noaa-ir fetch --collection 6 --collection 7 --limit 50
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`noaa-ir list`](list.md) — the catalogue, without downloading.
- [NOAA Institutional Repository](../../sources/noaa-ir/overview.md) — what the source publishes.
- [Access research](../../sources/noaa-ir/access.md) — how the source is reached, and what fails.
