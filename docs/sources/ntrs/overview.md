# NASA Technical Reports Server

## Purpose

NTRS is NASA's public archive of the agency's scientific and technical information — technical reports, conference papers, journal articles, flight manuals and the historical NACA series — each with an 11-digit accession number and an open citations API. `ntrs` resolves accession numbers to citations and titles to their best-matching record.

## Scope

Any accession number (the id NTRS files carry, e.g. `19730060780`); the Apollo-era records NTRS withdrew in 2013 answer 404 and are recorded as misses. With `--search` each key is a title: the search API's five best hits are scored by word overlap and the best at or above `--min-score` (0.6) is kept.

## Types of data

One citation per key: id, title, subtitle, report numbers, publication date, authors, the NASA center code, the STI type, the citation URL, and with `--search` the match score. Records only — NTRS documents are downloaded through [archive-items](../archive-items/overview.md) (the `nasa_techdocs` collection mirrors them) or directly by their citation URL.

## Commands

| Command                                           | Does                                                         |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [`bulk ntrs query`](../../commands/ntrs/query.md) | citations by accession number, or the best match for a title |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntrs`.
