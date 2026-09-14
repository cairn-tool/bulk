# arXiv — access research

What was established, by making the requests rather than reading about them, before the `arxiv` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

Probed 2026-09-14 for `bulk arxiv fetch`. Two hosts, with very
different behaviour, and the rate limit is the whole story.

| Host                         | What it serves                                                                                                                                          | Access                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `export.arxiv.org/api/query` | The Atom metadata API: `search_query` (the `cat:` / `au:` / `ti:` / `abs:` syntax), `id_list`, `start` and `max_results` paging, `sortBy` / `sortOrder` | Open, no key. **Strictly rate-limited — see below**        |
| `arxiv.org/pdf/<id>[v<n>]`   | The PDF                                                                                                                                                 | Open; 200 `application/pdf`. Not rate-limited the same way |
| `arxiv.org/e-print/<id>`     | The submitted source (a gzip archive)                                                                                                                   | Open                                                       |
| `arxiv.org/abs/<id>`         | The abstract page, carrying `citation_*` meta tags (title, authors, date, `citation_pdf_url`, `citation_arxiv_id`)                                      | Open; a metadata fallback if the API is unreachable        |

## The rate limit is the trap

arXiv's stated policy is **one API request every three seconds**, and it
is enforced by an edge that does not forgive a burst. Probing it with a
handful of quick requests earned a `429` with a 14-byte
`Rate exceeded.` body — **no `Retry-After` header**, no `x-rate-limit-*`
headers, and the block persisted for far longer than the pause the
request rate would suggest (still refusing after several minutes of
waiting during this probe).

Observed on 2026-09-14: after the initial probing burst the block held
for **over twenty minutes**; a single `id_list` request then succeeded
(HTTP 200, a valid feed), and the next request minutes later was 429
again. The penalty window is long and it flaps, so the API is best used
in one unhurried pass rather than repeated attempts.

Two consequences for the command:

- **`export.arxiv.org` carries a declared 3 s floor** in
  [the per-host rate limiter](../../guide/fetching.md)
  (`DECLARED`), because the host publishes no headers for the limiter to
  learn from. `bulk arxiv fetch` also calls `ratelimit.declare()`
  itself, so the pacing holds even if the table is ever trimmed.
- **A 429 here is not a transient**: the generic retry cannot clear it,
  so the command stops with a plain message saying to wait and re-run,
  rather than hammering a host that has already said no.

The PDF host is the ordinary one and takes the run's `--delay`.

## Identifiers

Both schemes work in `id_list` and in the file paths: the modern
`1706.03762` (optionally `v5`) and the pre-2007 `cs/9901002`. The Atom
`<id>` is `http://arxiv.org/abs/<id>v<n>`, so the version is parsed off
the end and kept in its own manifest column; the file name carries it
(`1706.03762v7 - Attention Is All You Need.pdf`) because arXiv papers
are revised in place and the version is what makes a copy reproducible.

## Fields taken

From each Atom entry: id and version, title, authors, summary, primary
category and all categories, published and updated dates, and arXiv's
own `arxiv:doi`, `arxiv:journal_ref` and `arxiv:comment` — the last three
are how an e-print is matched to its published version (and to
`bulk crossref query`).

## Requests made

| Request                                                               | Result                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `export.arxiv.org/api/query?...` (http)                           | 301 to https                                                                                                                                                                                                    |
| GET `export.arxiv.org/api/query?search_query=cat:cs.AR&max_results=2` | **429 `Rate exceeded.`** after earlier probing; no `Retry-After`; still 429 on retries minutes later                                                                                                            |
| GET `arxiv.org/abs/1706.03762`                                        | 200, 43 KB, `citation_title` / `citation_author` / `citation_pdf_url` / `citation_arxiv_id` meta tags                                                                                                           |
| GET `arxiv.org/pdf/1706.03762`                                        | 200 `application/pdf`, 2,215,244 bytes                                                                                                                                                                          |
| GET `arxiv.org/pdf/1706.03762v5`                                      | 200 `application/pdf`, 2,201,700 bytes — a specific version                                                                                                                                                     |
| GET `arxiv.org/pdf/cs/9901002`                                        | 200 `application/pdf` — the old identifier scheme                                                                                                                                                               |
| GET `arxiv.org/list/cs.AR/recent`                                     | 200 — a listing page, if the API is ever unusable                                                                                                                                                               |
| GET `export.arxiv.org/api/query?id_list=1706.03762`                   | **200**, a valid Atom feed — the parser is verified against it (id 1706.03762, version 7, 8 authors, `cs.CL` primary, `cs.CL`/`cs.LG`, published 2017-06-12, updated 2023-08-02, comment "15 pages, 5 figures") |
| GET `arxiv.org/e-print/1706.03762v7`                                  | 200, 1,150,988 bytes, gzip magic — the `--source` route                                                                                                                                                         |

## What is verified

The entry parser (against the live feed above), the file naming, both
download routes (PDF 2.2 MB and source 1.1 MB, magic-checked), the
manifest columns, and the 429 path — which exits 1 with a plain message
and no traceback. The **multi-page search loop** (`search_query` with
`start`/`max_results` paging) is written to the same Atom shape but was
not exercised end to end: every attempt during this session fell inside
arXiv's block. It should be run once against a small `--limit` before a
large pull is trusted.
