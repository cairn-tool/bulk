# NRC ADAMS public library

## Purpose

ADAMS is the US Nuclear Regulatory Commission's document management system, and its public library holds the agency's public record — inspection reports, licensing correspondence, NUREG reports, design documents, meeting transcripts, hearing exhibits — back to 1999, with the older library imaged. ADAMS Public Search (`adams-search.nrc.gov`) is its current front end, an Angular application over a JSON API that `nrc-adams` uses to select documents and pull their files.

## Scope

Documents named by accession number (`--ml`, `--ml-from`) or selected by a search — `--q` free text (Lucene field syntax works), `--docket`, `--type`, `--added` and `--dated` date ranges, any combination — paged 1,000 at a time. Packages (`IsPackage`) have no file of their own; `--packages` pulls their member documents. Documents are added daily and accession numbers are stable. The files on `www.nrc.gov/docs/` deny a browser User-Agent sent from a script and are served to curl's own; the record's `DocumentSize` is not the served byte count, so files are verified by magic only.

## Types of data

The document files ADAMS serves — PDFs almost always — named `<accession number> - <title>.<ext>` under the year the document was added, with accession number, title, document date, date added, document types, docket numbers, authors, affiliations, listed size, page count, package flag and parent packages in the manifest; the search answers are kept as `_adams-search.json`.

## Commands

| Command                                                     | Does                        |
| ----------------------------------------------------------- | --------------------------- |
| [`bulk nrc-adams fetch`](../../commands/nrc-adams/fetch.md) | pull the selected documents |
| [`bulk nrc-adams list`](../../commands/nrc-adams/list.md)   | the matching documents      |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.nrc-adams`.
