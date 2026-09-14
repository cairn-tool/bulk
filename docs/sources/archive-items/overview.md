# Internet Archive items

## Purpose

The Internet Archive is the largest open digital library; an **item** is its unit — a document, book, recording or dataset with its files, each file carrying its format, size, md5 and sha1 in the item's metadata. `archive-items` pulls the files of items selected by search, collection or identifier, verifying every byte against the metadata, and looks item records up by identifier.

## Scope

Any item the search API can name: `--query` in the IA search syntax (`collection:nasa_techdocs AND year:1969`), `--collection`, or `--identifier`; the scrape API enumerates in pages of at least 100 with a cursor. By default the original documents are taken and IA's own derivatives (thumbnails, torrents, OCR indexes, logs, item tiles) skipped; `--file-format` and `--suffix` narrow, `--originals-only` keeps only `source: original`, `--all-files` takes everything. Every file is verified against the metadata's byte count and sha1 as it streams. The lookup half returns the item record and, with `--files`, its file list; `--search` runs an advanced search and reports the matching identifiers.

## Types of data

Whatever the items hold — PDFs (`Text PDF`, `Image Container PDF`), DjVu and its text layers, EPUBs, Abbyy OCR archives, audio, video, images, data files — filed as `<collection or query>/<identifier>/<file>`, with each item's full metadata document kept under `_metadata/<identifier>.json` and the item list in `_items.tsv`. A query record carries identifier, title, creator, date, mediatype, collections, publisher, language, licence, file count and total bytes.

## Commands

| Command                                                             | Does                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`bulk archive-items fetch`](../../commands/archive-items/fetch.md) | pull the selected items' files, sha1-verified                    |
| [`bulk archive-items list`](../../commands/archive-items/list.md)   | the selected items and their files                               |
| [`bulk archive-items query`](../../commands/archive-items/query.md) | item records by identifier, or the identifiers matching a search |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.archive-items`.
- [archive-wayback](../archive-wayback/overview.md) — the Wayback Machine, the same organisation's snapshot index.
