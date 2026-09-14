# OSTI.GOV

## Purpose

OSTI — the Department of Energy's Office of Scientific and Technical Information — is the repository of DOE and national-laboratory research output: technical reports back to the Manhattan Project, journal articles, conference papers, theses, patents and data, most with full text on `osti.gov`. Its API is open, key-less and documented, and `osti` both pulls documents by any of its filters and looks report designations up.

## Scope

Records selected by any combination of the API's filters — `--query` (the general `q`), `--identifier` (report or contract number), `--osti-id`, `--doi`, `--author`, `--title`, `--subject`, `--research-org`, `--sponsor-org`, `--fulltext-search`, and `--from`/`--until` on publication date (or entry date with `--by-entry-date`) — 200 a page (1,000 is accepted). Only records with full text are taken unless `--citations-only-too`. The lookup half sends a report designation to the `identifier` search (volume and revision suffixes rewritten to OSTI's `-VOL.1`/`-REV.2` forms) and keeps every match. The API advertises no rate limit; `--delay` governs.

## Types of data

The full-text documents (`servlets/purl/<osti_id>`, PDFs) named `<report number or OSTI id> - <title>.pdf` under the product type, with OSTI id, report number, title, authors, product type, publication date, DOI, research and sponsor organisations, subjects, country and format in the manifest and every record in `_records.json`/`_records.tsv`. A query record carries report number, title, date, authors, OSTI id, DOI and the citation URL, with all matches in `--format json`.

## Commands

| Command                                           | Does                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| [`bulk osti fetch`](../../commands/osti/fetch.md) | pull the full-text documents the filters select |
| [`bulk osti list`](../../commands/osti/list.md)   | the records selected                            |
| [`bulk osti query`](../../commands/osti/query.md) | records by report designation                   |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.osti`.
- [ntis-ntrl](../ntis-ntrl/overview.md) — whose DOE-origin documents come from here.
