# NIST/NBS Technical Series

## Purpose

NIST — and the National Bureau of Standards before it — issues its work as the NIST Technical Series: Special Publications, FIPS, Interagency and Internal Reports, Technical Notes, Handbooks, Monographs, Circulars, Letter Circulars, Building Science Series and about 170 more series back to the 1920s. The Research Library publishes the whole catalogue as one file, every record's DOI resolves to the PDF, and Crossref holds the same DOIs for single lookups. `nist-techpubs` pulls publications by series, designation, title or date and looks designations up.

## Scope

The catalogue is `allrecords-MODS.xml` from the latest monthly release of `usnistgov/NIST-Tech-Pubs` on GitHub — every NIST/NBS technical-series publication with a public DOI (20,381 records, ~84 MB, MODS 3.7 exported from the library's Alma catalogue) — taken once and kept under `_catalogue/`; selection then happens locally (`--series`, `--id`, `--query` on title words, `--author`, `--subject`, `--doi`, a `--from`/`--until` year window). The DOI tail is the designation (`10.6028/NIST.SP.800-53r5` is NIST SP 800-53r5), and `doi.org` redirects to the PDF on `nvlpubs.nist.gov` in one hop. The lookup half asks Crossref for `10.6028/<designation>`; `--resolve` follows the DOI and reports the PDF's URL.

## Types of data

Publication PDFs named `<designation with spaces> - <title>.pdf` under the series (`NIST.SP/`, `NBS.CIRC/` …), with designation, series, title, authors, corporate authors, date, DOI, genre and subjects in the manifest and the selection in `_records.json`/`_records.tsv`. A query record carries designation, series, DOI, title, subtitle, authors, issued date, type, publisher, institution, a short abstract and the landing URL.

## Commands

| Command                                                             | Does                                         |
| ------------------------------------------------------------------- | -------------------------------------------- |
| [`bulk nist-techpubs fetch`](../../commands/nist-techpubs/fetch.md) | pull the selected publications               |
| [`bulk nist-techpubs list`](../../commands/nist-techpubs/list.md)   | the publications selected from the catalogue |
| [`bulk nist-techpubs query`](../../commands/nist-techpubs/query.md) | records by designation, through Crossref     |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.nist-techpubs`.
- [crossref](../crossref/overview.md).
