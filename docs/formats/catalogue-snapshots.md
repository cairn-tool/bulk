# Catalogue snapshots

Every `fetch` (and `list --dest`) saves what the source answered, verbatim, in the destination
before anything is built from it — so a pull can be audited against the catalogue it was planned
from, and re-planned offline with `--list-file`. The file is the plugin's _catalogue file_, named
on its `fetch` page:

| Plugin               | Snapshot                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ntsb-reports`       | `_reports-list.json` — the SharePoint list, as served.                                                                          |
| `ntsb-dockets`       | `_dockets-list.html` (the all-time search result), `_dockets.tsv`, and per docket `_docket.html`, `_docket.json`, `_items.tsv`. |
| `ntsb-carol`         | `_periods.json` — the session, template and per-period counts; the exports themselves are the data.                             |
| `ntsb-avdata`        | `_avdata-list.html`.                                                                                                            |
| `archive-items`      | `_items.json` (the identifiers), `_items.tsv`, and `_metadata/<identifier>.json` per item.                                      |
| `archive-wayback`    | `_cdx.json` and `_cdx.tsv`.                                                                                                     |
| `arxiv`              | `_feed/pageN.xml` (the Atom pages) and `_papers.tsv`.                                                                           |
| `cern-cds`           | `_records/<id>.xml` — each record as MARCXML.                                                                                   |
| `cern-yellowreports` | `_oai/pageN.xml`.                                                                                                               |
| `ietf-rfc`           | `_rfc-index.xml`.                                                                                                               |
| `itu-t`              | `_itut-api.json` — the API answer per series.                                                                                   |
| `itu-r`              | `_pages/*.html` (the crawled pages, cached) and `_editions.tsv`.                                                                |
| `nist-techpubs`      | `_catalogue/allrecords-MODS.xml` with `release.json`, kept across runs; `_records.json` and `_records.tsv` for the selection.   |
| `noaa-ir`            | `_noaa-<pid>.json` per collection.                                                                                              |
| `nrc-adams`          | `_adams-search.json`.                                                                                                           |
| `ntis-ntrl`          | `_rows.json` (the search rows), `_records.json` and `_records.tsv` (the harvested records).                                     |
| `osti`               | `_records.json` and `_records.tsv`.                                                                                             |
| `usda-treesearch`    | `_ids.json`, `_records.json` and `_records.tsv`.                                                                                |

Snapshots are the source's own bytes or a direct projection of them; the manifest is derived from
a snapshot, never the other way round.
