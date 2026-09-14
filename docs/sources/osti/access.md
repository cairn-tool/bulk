# OSTI.GOV — access research

What was established, by making the requests rather than reading about them, before the `osti` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

Probed 2026-09-14 for `bulk osti fetch`. OSTI is the DOE Office
of Scientific and Technical Information; its API is open, key-less and
documented at [www.osti.gov/api/v1/docs](https://www.osti.gov/api/v1/docs)
(an HTML page, not a machine-readable spec — the parameters below are
read off it).

| Endpoint                                | Shape                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `www.osti.gov/api/v1/records`           | The search. Returns a **JSON array** of records (not an envelope), with the total in the `X-Total-Count` response header and a `Link: <…>; rel="next"` header for the next page |
| `www.osti.gov/api/v1/records/{osti_id}` | One record                                                                                                                                                                      |
| `www.osti.gov/servlets/purl/{osti_id}`  | **The full text** — the `href` of the record's `rel: fulltext` link                                                                                                             |
| `www.osti.gov/biblio/{osti_id}`         | The citation page — the `rel: citation` link                                                                                                                                    |

`Accept:` selects the format: `application/json` (the default),
`application/xml`, `application/x-bibtex`.

## Query parameters (from the docs page)

`q` (the whole record) · `osti_id` · `doi` · `fulltext` (searches inside
the text) · `biblio` · `author` · `title` · `identifier` (report **or**
contract number) · `sponsor_org` · `research_org` · `contributing_org` ·
`source_id` · `publication_date_start` / `_end` and `entry_date_start` /
`_end` (**MM/DD/YYYY**) · `language` · `country` · `site_ownership_code`
· `subject` · `has_fulltext` (`true` / `false`) · `sort` · `order`
(`asc` / `desc`) · `rows` (default 20) · `page` (default 1).

The docs note that values must be URL-escaped; the command sends them
through `urlencode`, so quoted phrases work.

## What the probe established

- **`rows` accepts at least 1,000** (100, 200 and 1,000 all returned
  exactly that many). The command uses 200 a page to keep each response
  small, and pages on `page` until a short page comes back.
- **`has_fulltext=true` is worth defaulting to**: a search for one lab
  reported `X-Total-Count: 30050` with it set, and every returned record
  had a `rel: fulltext` link. Citation-only records are selectable with
  `--citations-only-too`.
- **Every fulltext link seen was on `osti.gov`** (0 of 200 pointed
  off-site), so the download is one host. Some records also carry a
  `citation_doe_pages` link, which the command ignores.
- **No rate-limit headers are advertised** and no documented policy was
  found, so nothing is declared to `the per-host rate limiter`; the run's
  `--delay` governs. The files are large — two 1969 ORNL reports came to
  93.5 MB — so the transfer, not the request rate, is the constraint.
- **`report_number` is present on about 43%** of a mixed result set (85
  of 200) and is the identifier these documents are known by
  (`ORNL-TM-2578`, `BNL-229890-2026-JAAM`); the command names files by it
  and falls back to `OSTI <osti_id>`. A record can carry several,
  semicolon-separated — the first is used.
- `product_type` is a small clean vocabulary (Journal Article, Technical
  Report, Conference, Dataset), so it makes the folder level.

## Relation to `bulk osti query`

The same API, different purpose: `bulk osti query` resolves a report
designation to its record (the title-determination use), while this
command selects a set and pulls the documents. The query command's
`-V1` → `-VOL.1` designation rewriting is not needed here because the
selection is by search rather than by exact designation.

## Requests made

| Request                                                      | Result                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `api/v1/docs`                                            | 200 HTML — the parameter documentation                                                                                                                                      |
| GET `api/v1/records?identifier=ORNL-TM-2578&rows=2`          | 200, `X-Total-Count: 1`, one record with `links` = citation + fulltext                                                                                                      |
| GET `servlets/purl/4781475`                                  | 200 `application/pdf`, 7,153,799 bytes                                                                                                                                      |
| GET `api/v1/records?research_org=…&has_fulltext=true&rows=3` | 200, `X-Total-Count: 30050`, `Link: …rel="next"`                                                                                                                            |
| GET the same with `rows=100`, `200`, `1000`                  | 100, 200 and 1,000 records                                                                                                                                                  |
| Command tests                                                | `--identifier` and `--research-org` + `--from`/`--until` selections listed correctly; two 1969 ORNL reports pulled (53.5 MB and 44.5 MB, both `%PDF-`); re-run skipped both |
