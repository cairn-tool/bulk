# File formats

The files `bulk` itself writes. Formats owned by somebody else — the catalogue responses each
source serves — are described per source under [Data sources](sources.md).

## The formats

| Format                                                | File                                                                   | Written by               | Owner of the shape             |
| ----------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------ | ------------------------------ |
| [Manifest](formats/manifest.md)                       | `<dest>/_manifest.tsv`                                                 | every `fetch`            | the plugin's `manifestColumns` |
| [Download log](formats/download-log.md)               | `<dest>/_download-log.tsv` (and `_reports-log.tsv`)                    | every `fetch`            | `src/pull/transfer-log.ts`     |
| [Catalogue snapshots](formats/catalogue-snapshots.md) | `<dest>/_reports-list.json`, `_records.tsv`, `_metadata/`, `_pages/` … | every `fetch` and `list` | the source, verbatim           |
| [Query cache](formats/query-cache.md)                 | `<cache>/query/<plugin>.json` or `--cache FILE`                        | every `query`            | `src/query/cache.ts`           |
| [Cookie jar](formats/cookie-jar.md)                   | `<cache>/<solver>/<host>.jar`                                          | the challenge solvers    | curl's Netscape format         |

Two more are documented elsewhere: the [configuration file](configuration.md) and the
[result payloads](contract.md).

## Two kinds of on-disk state

**The record of a pull** — the catalogue snapshot, the manifest, the log, the per-record files —
lives in the destination beside the files it describes. It is what makes a pull auditable and
resumable: the log links every file to its source URL, expected and actual bytes and SHA-256, and
the manifest is what a re-run compares against. Nothing under a destination is ever deleted by a
re-run.

**The cache** — cookies, query answers, the update check — lives under the cache directory and is
safe to delete at any time; `bulk cache clear` removes the cookies, and a query cache is simply
re-filled.

## Rules that apply to every format here

- TSV cells are one line: tabs, carriage returns and newlines in a value become a space. A
  manifest is a record, not a lossless store; the catalogue snapshot beside it is the lossless one.
- Rows are sorted by byte comparison of their keys, never by locale, so two machines write the
  same file for the same catalogue.
- Files are written atomically where a half-written file would mislead a re-run (JSON caches,
  cookie jars); the log is append-only and flushed per row.
