# Crossref

## Purpose

Crossref is the DOI registration agency for scholarly publishing; its open API returns the registered metadata of any DOI — bibliographic fields, licences, citation counts and the publisher's registered full-text links. `crossref` turns DOIs (or citation text) into those records.

## Scope

Any DOI, given bare, as a `doi:` URI or as a doi.org URL; `--search` treats each key as citation text (`query.bibliographic`) and reports the best-matching works. Requests carry a `mailto:` User-Agent from the configured contact, which puts them in Crossref's polite pool (10 requests/s rather than 5); the advertised limit is read off each response and honoured automatically.

## Types of data

One record per DOI: DOI, type, title and subtitle, authors, container title, publisher, issued date, volume/issue/page, ISSN and ISBN, licence URLs, reference and citation counts, the landing URL, and with `--links` the registered full-text links (publisher PDFs, often paywalled).

## Commands

| Command                                                   | Does                                            |
| --------------------------------------------------------- | ----------------------------------------------- |
| [`bulk crossref query`](../../commands/crossref/query.md) | records by DOI, or the DOIs matching a citation |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.crossref`.
- [nist-techpubs](../nist-techpubs/overview.md) — whose lookups go through Crossref too.
