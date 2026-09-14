# Open Library

## Purpose

Open Library is the Internet Archive's open catalogue of books — one record per edition, keyed by ISBN among other identifiers — with a books API that answers twenty ISBNs in one request. `openlibrary` turns ISBNs into title, authors, date and publisher.

## Scope

Any ISBN-10 or ISBN-13, hyphens and spaces tolerated: ISBN-10s are converted to ISBN-13 and check digits verified before anything is sent, so a mistyped key is reported and never costs a request. `--find FILE` extracts ISBNs from free text. Twenty ISBNs go in one request; an unknown ISBN is absent from the answer and cached as a miss.

## Types of data

Per ISBN: title, subtitle, authors, publish date, publishers, page count, up to twelve subjects and the Open Library URL.

## Commands

| Command                                                         | Does            |
| --------------------------------------------------------------- | --------------- |
| [`bulk openlibrary query`](../../commands/openlibrary/query.md) | records by ISBN |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.openlibrary`.
