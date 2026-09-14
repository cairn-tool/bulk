# Crossref — access research

What was established, by making the requests rather than reading about them, before the `crossref` plugin was written. Ported from the research note `query/_index.md and the title-determination session notes` in the original notes; every request below was actually made. Ported from the query index and the title-determination session (2026-09-13/14) rather than a per-source probe.

## The API

`GET https://api.crossref.org/works/<doi>` returns the work's record; `works?query.bibliographic=<text>&rows=<n>` searches by citation text. Both are open and key-less. Documented at api.crossref.org/swagger-ui.

## The polite pool

Sending a `mailto:` in the User-Agent puts the request in Crossref's **polite pool** — the response says so: `x-api-pool: polite-single` with `x-rate-limit-limit: 10` per `1s`, against `public-single` and 5 per 1 s without it. The plugin sends `bulk/<version> (mailto:<contact>)` from the configured `contact`; the advertised limit is then read off every response and honoured automatically by the per-host limiter, so `--delay` is a floor, not the mechanism. Without a configured contact the User-Agent carries the package name and homepage and the public pool applies.

## What a record carries

DOI, type, title and subtitle, authors (`given family`, or a group `name`), container title, publisher, the issued date (`issued`, else `published-print`, `published-online`, `created`, as `YYYY[-MM[-DD]]`), volume, issue, page, ISSN and ISBN lists, licence URLs, reference and citation counts, the landing URL, and the registered full-text `link`s with their content type and version (`vor`, `am`). A DOI Crossref does not know is a 404, reported as a miss and cached as such.

## Requests made

| Request                                                              | Result                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `works/10.1080/16000870.2018.1440870` with a mailto User-Agent       | 200, `x-api-pool: polite-single`, `x-rate-limit-limit: 10`, `x-rate-limit-interval: 1s`         |
| the same without the mailto                                          | 200, `x-api-pool: public-single`, `x-rate-limit-limit: 5`                                       |
| `works?query.bibliographic=Introduction+to+Algorithms+Cormen&rows=3` | 200, `total-results` and three items                                                            |
| `works/10.5170/CERN-2004-003-V-1`                                    | 200, `link` carries the CDS PDF (behind the Anubis gate; see [cern-cds](../cern-cds/access.md)) |
