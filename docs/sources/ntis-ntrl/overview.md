# National Technical Reports Library (NTIS)

## Purpose

The National Technical Information Service acquires, indexes, abstracts and archives US government-sponsored technical reports — the largest such collection there is — and its public catalogue is the National Technical Reports Library at `ntrl.ntis.gov`. `ntis-ntrl` harvests records by search or accession number and pulls the full text from the issuing agency, because NTRL's own download does not work; it also looks single records up.

## Scope

Records selected by `--query` (NTRL's own search, paged 100 at a time through the JSF/PrimeFaces session) or `--accession`, each read from its stateless title-detail page. NTRL's "Download PDF" action returns an empty 200 — verified in a browser as well as from a script, on 2026-09-14 — so by default the document is sought at the issuing agency: OSTI's `identifier` search for the DOE-origin accessions (it tolerates NTIS's de-punctuated report numbers: `ORNLTM3177` finds ORNL-TM-3177), DTIC for `AD…` numbers. `--source ntrl` replays NTRL's own action anyway, for the day it is fixed; `--records-only` harvests the records and looks for no documents. Records without a source are listed with their accession numbers.

## Types of data

Records with title, personal and corporate authors, publication date, page count, document type, source agency, NTIS subject categories, keywords, supplemental notes, issue number, abstract, and whether NTRL offers the document (in `_records.json`/`_records.tsv`); and, where OSTI or DTIC holds them, the document PDFs named `<accession> - <title>.pdf` under the first NTIS subject category.

## Commands

| Command                                                     | Does                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`bulk ntis-ntrl fetch`](../../commands/ntis-ntrl/fetch.md) | harvest records and pull the documents the agencies hold                 |
| [`bulk ntis-ntrl list`](../../commands/ntis-ntrl/list.md)   | the records, with where each document was found                          |
| [`bulk ntis-ntrl query`](../../commands/ntis-ntrl/query.md) | a record by accession number, or the accession numbers matching a search |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntis-ntrl`.
- [osti](../osti/overview.md) — where the DOE-origin documents come from.
