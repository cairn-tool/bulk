# Wayback Machine — access research

What was established, by making the requests rather than reading about them, before the `archive-wayback` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made. The items and the Wayback Machine were probed together; this page is the whole note, shared with [archive-items](../archive-items/access.md).

Probed 2026-09-14 for `bulk archive-items`, `bulk archive-wayback` and `bulk archive-items query`.
Everything used here is anonymous — no key, no login, no challenge.
`archive.org/robots.txt` disallows only `/control/` and `/report/`; the
search, metadata, download and Wayback paths are not restricted.

## The four endpoints

| Endpoint                                                                              | Shape                                                  | Notes                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scrape search** `archive.org/services/search/v1/scrape?q=&fields=&count=&cursor=`   | `{"items": [...], "cursor", "total"}`                  | The bulk enumerator. **`count` has a minimum of 100** (`count '3' is too small (min count=100)`); page with the returned `cursor` until it stops coming. `fields` is a comma list — `identifier,title,creator,date,year,mediatype,collection,item_size,downloads,publicdate` |
| **Advanced search** `archive.org/advancedsearch.php?q=&fl[]=&rows=&page=&output=json` | `{"response": {"numFound", "docs"}}`                   | Small, sortable result sets; `fl[]` repeated per field. Used by `bulk archive-items query --search`. A collection that does not exist returns `numFound: 0` rather than an error                                                                                             |
| **Metadata** `archive.org/metadata/<identifier>`                                      | `{"metadata": {...}, "files": [...], "server", "dir"}` | Every file with `name`, `format`, `size`, **`md5`**, **`sha1`**, `source` (`original` / `derivative` / `metadata`). A non-existent item returns `{}` with HTTP 200 — check for the `metadata` key, not the status                                                            |
| **Download** `archive.org/download/<identifier>/<file>`                               | The file                                               | Redirects to a `ia######.us.archive.org` node                                                                                                                                                                                                                                |
| **Wayback CDX** `web.archive.org/cdx/search/cdx?url=&output=json`                     | `[[header…], [row…]]`                                  | `filter=mimetype:…`, `filter=statuscode:200`, `collapse=digest                                                                                                                                                                                                               | urlkey`, `from`/`to` (`YYYYMMDD`), `limit`, `matchType` |
| **Wayback content** `web.archive.org/web/<timestamp>id_/<url>`                        | The original bytes                                     | The **`id_`** suffix suppresses Wayback's HTML rewriting and banner — essential for getting the document itself                                                                                                                                                              |

## Traps found

- **`matchType` and a trailing `*` are mutually exclusive.** `url=pcisig.com*`
  works (CDX infers a prefix match) and `url=pcisig.com&matchType=prefix`
  works, but `url=pcisig.com*&matchType=prefix` matches **nothing** — the
  `*` is taken literally. `the Internet Archive client` strips a trailing `*` when a
  `--match` is given, so both forms behave.
- **The scrape `count` minimum is 100**, so a "give me 3 items" request
  must still ask for 100 and slice.
- **A missing item is an HTTP 200 with `{}`** from the metadata endpoint.
- **CDX answers 503 under load.** Seen once in testing and transient; the
  client retries 429/503 three times with a growing pause.
- `ia-fts.archive.org` and `ia-pub-fts-api.archive.org` (full-text
  search inside books) **do not resolve**, and `api.archivelab.org` does
  not connect — there is no search-inside route from here.
- `archive.org/wayback/available` returned **429** during testing while
  the CDX endpoint kept answering; CDX is the better index anyway.

## Pacing

Five metadata calls back to back: 0.5–1.3 s each, all 200. Three CDX
calls: 1.6 s, 2.5 s, 5.9 s — CDX is the slow one and the one that rate-
limits, so the commands pace it at the run's `--delay` and cap it at 2 s
between catalogue calls.

## Verification

IA states `size` **and** `sha1` for every file, so `bulk archive-items fetch` checks the byte count during the download and the sha1
afterwards; a mismatch is deleted and counted as a failure. Wayback
gives no checksum — the CDX row's `length` is the _compressed record_
size, not the file's, so snapshots are verified by magic bytes only.

## Why Wayback matters here

[METHOD.md](../../guide/fetching.md) records a
dozen hosts as permanently blocked to scripts and names "Internet
Archive" as the recourse. That now has a command. Confirmed against
**`pcisig.com`**, recorded as Cloudflare-challenged with "None from
curl": its PDFs are still in the Wayback Machine and were pulled —
`current/pcihp/phps_09.pdf` (178 KB) and `current/pcipm/pm10.pdf`
(230 KB), both genuine `%PDF-`. The same route should be tried for
`dl.acm.org`, `www.intel.com` and the other walled hosts before an
item is written off.

## Requests made

| Request                                                                | Result                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `services/search/beta/page_production/scrape.json`                 | 404 — not the endpoint                                                                                                                                                                       |
| GET `services/search/v1/scrape?…&count=3`                              | 400 `count '3' is too small (min count=100)`                                                                                                                                                 |
| GET `services/search/v1/scrape?q=collection:nasa_techdocs&count=100`   | 200, `total` 26,275, 100 items + cursor                                                                                                                                                      |
| GET `advancedsearch.php?q=collection:nasa_techdocs&rows=3`             | 200, `numFound` 26,275                                                                                                                                                                       |
| GET `advancedsearch.php?q=collection:nsia` / `collection:(nasaimages)` | 200, `numFound` 0 — no such collections                                                                                                                                                      |
| GET `metadata/nasa_techdoc_19730060780`                                | 200, 13 files with sizes and sha1s                                                                                                                                                           |
| GET `download/…/19730060780.pdf_meta.txt`                              | 200, 1 KB                                                                                                                                                                                    |
| GET `cdx?url=pcisig.com*&filter=mimetype:application/pdf`              | 200, captures listed                                                                                                                                                                         |
| GET `cdx?url=pcisig.com*&matchType=prefix&…`                           | 200, **0 rows** (the trap above)                                                                                                                                                             |
| GET `web/19970701020004id_/http://www.pcisig.com:80/…/phps_09.pdf`     | 200 `application/pdf`, 182,284 bytes, `%PDF-`                                                                                                                                                |
| GET `ia-pub-fts-api.archive.org`, `ia-fts.archive.org`                 | DNS: no such host                                                                                                                                                                            |
| GET `api.archivelab.org/books/…/searchinside`                          | connection timed out                                                                                                                                                                         |
| GET `archive.org/wayback/available?url=pcisig.com`                     | 429                                                                                                                                                                                          |
| GET `archive.org/robots.txt`                                           | 200; only `/control/`, `/report/` and similar disallowed                                                                                                                                     |
| Command tests                                                          | items: one item's PDF pulled (27.5 MB) and sha1-verified, re-run skipped it; wayback: two pcisig.com PDFs recovered; query: identifier, `--files`, `--search`, cache and TSV all as expected |
