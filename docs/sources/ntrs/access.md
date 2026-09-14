# NASA Technical Reports Server — access research

What was established, by making the requests rather than reading about them, before the `ntrs` plugin was written. Ported from the research note `query/_index.md and the title-determination session notes` in the original notes; every request below was actually made. Ported from the query index and the title-determination session (2026-09-13/14) rather than a per-source probe.

## The API

`GET https://ntrs.nasa.gov/api/citations/<id>` returns one citation by its 11-digit accession number (the id NTRS files carry, e.g. `19730060780`); `api/citations/search?q=<text>&page.size=5` searches. Both are open and key-less; the plugin sends a polite User-Agent with the configured contact.

## Withdrawn records

The Apollo-era records NTRS withdrew in 2013 answer 404; the plugin reports the miss and caches it, so a re-run costs nothing for them.

## Title search

With `--search` each key is a title: parentheticals and `- Vol …`/`- Part …` suffixes are dropped, the first 150 characters are sent, and the best hit whose word overlap (words longer than three letters, either direction) reaches `--min-score` (0.6) is kept with its score. Nothing below the threshold is a miss.

## What a record carries

id, title, subtitle, report numbers (from `otherReportNumbers`, the `Report Number:` prefix stripped), the first publication date (else `created`), authors, the NASA center code, the STI type, and the citation URL.

## Requests made

| Request                                                            | Result                                        |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `api/citations/19730060780`                                        | 200, the Saturn V Flight Manual SA-503 record |
| `api/citations/19660014374`                                        | 200                                           |
| `api/citations/search?q=Saturn+V+Flight+Manual+SA-503&page.size=5` | 200, the manual first                         |
