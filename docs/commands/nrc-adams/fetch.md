# `nrc-adams fetch`

## Synopsis

```text
bulk nrc-adams fetch [options]
```

Pull NRC documents into <dest>/<year added>/<accession number> - <title>.pdf.

Select by accession numbers (--ml, or --ml-from FILE), or by a search: --q free text (Lucene
syntax works: DocumentType:"NUREG"), --docket, --type, --added / --dated ranges — any
combination; the search is paged 1,000 at a time and saved raw as _adams-search.json. Each
document's Url comes from the record; DocumentSize is not the served byte count, so files are
verified by magic. Packages (IsPackage) have no file of their own; --packages pulls their
member documents.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.nrc-adams.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_adams-search.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                | Default | Description                                                       |
| --------------------- | ------- | ----------------------------------------------------------------- |
| `--ml <MLxxxxxxxxx>`  | —       | Accession number; repeatable.                                     |
| `--ml-from <file>`    | —       | Accession numbers from a file, one per line.                      |
| `--q <text>`          | —       | Free-text query.                                                  |
| `--docket <n>`        | —       | Docket number (05000255); repeatable.                             |
| `--type <type>`       | —       | Document type (Inspection Report, NUREG, …); repeatable.          |
| `--added <from> <to>` | —       | Date added to ADAMS, YYYY-MM-DD YYYY-MM-DD.                       |
| `--dated <from> <to>` | —       | Document date, YYYY-MM-DD YYYY-MM-DD.                             |
| `--packages`          | `false` | Also pull the member documents of every package in the selection. |

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

Under the destination: `_adams-search.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `accession`, `title`, `document_date`, `date_added`, `type`, `docket`, `author`, `affiliation`, `listed_bytes`, `pages`, `is_package`, `package`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk nrc-adams fetch --ml ML11126A118 --ml ML26237A144 --packages --dest ~/archive/nrc
bulk nrc-adams fetch --added 2026-09-01 2026-09-07 --dry-run
bulk nrc-adams fetch --q "molten salt reactor" --dated 2024-01-01 2026-12-31 --limit 50
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`nrc-adams list`](list.md) — the catalogue, without downloading.
- [NRC ADAMS public library](../../sources/nrc-adams/overview.md) — what the source publishes.
- [Access research](../../sources/nrc-adams/access.md) — how the source is reached, and what fails.
