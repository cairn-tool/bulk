# ITU-R Recommendations

## Purpose

The ITU Radiocommunication Sector's Recommendations — broadcasting, mobile, satellite, propagation, spectrum management and the rest — are published as plain files with no API. `itu-r` crawls the series and Recommendation pages for every edition and pulls the editions selected by date and status.

## Scope

The series the default run covers (BO BS BT F M SF) or those given with `--series`; every edition of every Recommendation the series page lists, narrowed by `--since` (edition date) and `--status` (in force, superseded, all). The pages are Windows-1252 and are cached under `_pages/`, so a re-run refetches nothing it has; about 500 pages for the six default series.

## Types of data

Edition PDFs from `dms_pubrec/itu-r/rec/<series>/<edition id>!!PDF-E.pdf`, named `ITU-R <rec>-<n> (<yyyy-mm>) - <title>.pdf` under `<XX>-Series - <series name>/`, with the edition id, date, title and status in the manifest and every edition in `_editions.tsv`.

## Commands

| Command                                             | Does                       |
| --------------------------------------------------- | -------------------------- |
| [`bulk itu-r fetch`](../../commands/itu-r/fetch.md) | pull the selected editions |
| [`bulk itu-r list`](../../commands/itu-r/list.md)   | the editions selected      |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.itu-r`.
- [itu-t](../itu-t/overview.md).
