# USDA National Agricultural Library catalogue

## Purpose

The National Agricultural Library's catalogue — AGRICOLA, the bibliographic database of US agricultural literature since 1862, and PubAg, the USDA-authored journal articles — runs on Ex Libris Primo at `search.nal.usda.gov`, whose own public endpoint needs no key. `usda-nal` searches it and reports the best-matching records. Records are bibliographic: the digitised collections behind them (Alma-D) are closed, so documents come from [usda-treesearch](../usda-treesearch/overview.md).

## Scope

Any search text, in the index picked by `--field` (any, title, creator, subject, isbn, issn) and the collection picked by `--scope` (`agricola`, `pubag`, or `MyInstitution` for everything), with `--rows` candidates considered per key — the best in the table, all of them in `--format json`.

## Types of data

PNX records: id, title, creators (the `$$Q` normalised heading, so a name is clean rather than trailing its affiliation), date, publisher, type, language, series, host item, ISBN, ISSN, DOI, OCLC number, subjects, collections, a description and the full-display URL.

## Commands

| Command                                                   | Does                                       |
| --------------------------------------------------------- | ------------------------------------------ |
| [`bulk usda-nal query`](../../commands/usda-nal/query.md) | the best catalogue matches for search text |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.usda-nal`.
