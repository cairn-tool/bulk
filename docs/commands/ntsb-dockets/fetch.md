# `ntsb-dockets fetch`

## Synopsis

```text
bulk ntsb-dockets fetch [options]
```

Pull NTSB accident dockets into <dest>/<NTSB number> - <description>/[<sub-docket>/]<NNNN> - <title>.<ext>.

Enumerates every docket with one search POST (saved as _dockets-list.html and _dockets.tsv),
then for each selected docket fetches its page (kept as _docket.html in the docket's folder, its
header fields — Last Modified, Public Release Date, item counts — as _docket.json, its items as
_items.tsv) and pulls every file through docBLOB, verified by magic bytes and a non-empty body.
Select dockets with --ntsb-number / --project, or a slice with --office, --mode, --since / --until;
nothing is pulled without a selection (27,000 dockets is a crawl, not a command). Re-running
resumes; a docket whose item count fell since the last run is reported, never trimmed.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ntsb-dockets.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_dockets-list.html`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

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

Under the destination: `_dockets-list.html` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `docket`, `sub_docket`, `item`, `title`, `pages`, `photos`, `type`, `blob_id`, `file_name`, `redacted`, `_download-log.tsv`, and the files themselves.

`list` with --ntsb-number/--project lists the docket's items (item, pages, type, destination) rather than dockets.
<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntsb-dockets fetch --ntsb-number DCA96MA070 --dest ~/archive/ntsb/dockets    # TWA 800, 3,412 items
bulk ntsb-dockets fetch --ntsb-number DCA96MA068 --pdf-only                        # Delta 1288, PDFs only
bulk ntsb-dockets fetch --office DCA --mode Aviation --since 2015-01-01 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ntsb-dockets list`](list.md) — the catalogue, without downloading.
- [NTSB Docket Management System](../../sources/ntsb-dockets/overview.md) — what the source publishes.
- [Access research](../../sources/ntsb-dockets/access.md) — how the source is reached, and what fails.
