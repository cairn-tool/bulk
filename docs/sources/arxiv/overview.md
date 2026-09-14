# arXiv e-prints

## Purpose

arXiv is the open e-print archive for physics, mathematics, computer science and neighbouring fields: 2.4 million papers, each with its metadata in an open Atom API and its PDF and submitted source freely downloadable. `arxiv` pulls papers by identifier or search, versioned, and keeps the API's own feed pages as the catalogue record.

## Scope

Papers named by `--id` (new-style `1706.03762` or old-style `cs/9901002`) or selected by a search — `--query` in the API's `search_query` syntax, `--category`, `--author`, `--title`, ANDed — 100 a page in `--sort`/`--order`. The API asks for one request every three seconds and enforces it with a long block: a burst earns a `429 Rate exceeded.` with no `Retry-After` that outlasts ordinary retries (over twenty minutes in testing). The plugin declares that floor to the per-host limiter and treats a 429 as fatal rather than retrying through it. The PDF host is not limited the same way.

## Types of data

Per paper the PDF (`arxiv.org/pdf/<id>v<n>`) and, with `--source`/`--with-source`, the submitted e-print archive (a gzip, `arxiv.org/e-print/<id>`), named `<id>v<n> - <title>` under the primary category. The catalogue is the Atom feed itself under `_feed/pageN.xml` and `_papers.tsv`: id, version, title, authors, summary, primary and other categories, published and updated dates, DOI, journal reference, comment.

## Commands

| Command                                             | Does                                              |
| --------------------------------------------------- | ------------------------------------------------- |
| [`bulk arxiv fetch`](../../commands/arxiv/fetch.md) | pull the selected papers (PDFs, sources, or both) |
| [`bulk arxiv list`](../../commands/arxiv/list.md)   | the papers a search returns                       |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.arxiv`.
