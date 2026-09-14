# `archive-wayback fetch`

## Synopsis

```text
bulk archive-wayback fetch [options]
```

Pull Wayback snapshots into <dest>/<host>/<path>[ (<timestamp>)].<ext>.

Give a URL or a pattern (--url 'pcisig.com*' with --match prefix), or a file of them. The
CDX index is queried for each (saved as _cdx.tsv), collapsed to one row per distinct content
digest, filtered by --mimetype, --status and a --since/--until capture window; --all-captures
keeps every distinct capture instead of only the newest per URL. Files come from the `id_`
raw form, so the bytes are the original document, not a rewritten page, and are verified by
magic.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.archive-wayback.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_cdx.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                 | Default | Description                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `--url <url>`          | —       | A URL or pattern; repeatable.                                                                      |
| `--urls-from <file>`   | —       | URLs from a file, one per line.                                                                    |
| `--match <type>`       | —       | CDX match type for a pattern (prefix for 'host.com*'). One of `exact`, `prefix`, `host`, `domain`. |
| `--mimetype <type>`    | —       | Only captures of this MIME type (application/pdf).                                                 |
| `--status <code>`      | `200`   | Only captures with this status ('' for any).                                                       |
| `--since <yyyy-mm-dd>` | —       | Captures on or after.                                                                              |
| `--until <yyyy-mm-dd>` | —       | Captures on or before.                                                                             |
| `--all-captures`       | `false` | Every distinct capture, not just the newest per URL.                                               |
| `--cdx-limit <n>`      | `0`     | Cap the CDX rows per URL.                                                                          |

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

Under the destination: `_cdx.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `original`, `timestamp`, `mimetype`, `statuscode`, `digest`, `length`, `host`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk archive-wayback fetch --url 'pcisig.com*' --match prefix --mimetype application/pdf --dest ~/archive/wayback
bulk archive-wayback fetch --url https://www.intel.com/some/doc.pdf
bulk archive-wayback fetch --urls-from urls.txt --since 2006-01-01 --until 2010-12-31 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`archive-wayback list`](list.md) — the catalogue, without downloading.
- [Wayback Machine](../../sources/archive-wayback/overview.md) — what the source publishes.
- [Access research](../../sources/archive-wayback/access.md) — how the source is reached, and what fails.
