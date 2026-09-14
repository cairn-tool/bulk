# NTSB CAROL case database

## Purpose

CAROL (Case Analysis and Reporting Online) is the NTSB's case database: one record per investigated event, in every mode, with the vehicles, the findings coded to the CICTT taxonomy, the event sequence, injuries, probable cause and the factual, analysis and preliminary narratives. Its JSON API is what the CAROL web application uses, and `ntsb-carol` exports the database a year at a time as the API's own `data` (full records) and `summary` (the 45-column CSV) exports.

## Scope

181,844 cases from 1948 to the present as of 2026-09-13. An export is capped at 10,000 cases, so a year is one export unless it is larger, in which case it goes month by month (`cases-<year>-<mm>-…`). The current and previous year keep changing as cases close; `--refresh` redoes them. With `--reports`, the generated report PDF of every aviation case named in a year's summary (`carol-repgen/…/<Mkey>/pdf`) is pulled too.

## Types of data

Per period and format a zip from `Query/FileExport`, unzipped beside it: `cases-<period>-data.json` (the full case records: event, vehicles, engines, findings with codes, the CICTT sequence, injuries, coordinates, probable cause, narratives), `cases-<period>-summary.csv` (the UI's 45-column export, whose last two columns are the docket URL `data.ntsb.gov/Docket?ProjectID=<Mkey>` and the report URL), and the export's `readme.txt`. Optionally `<year>/reports/<NTSB number> - <make model>.pdf`.

## Commands

| Command                                                       | Does                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [`bulk ntsb-carol fetch`](../../commands/ntsb-carol/fetch.md) | export the selected years (data, summary or both), unzip, optionally pull the generated reports |
| [`bulk ntsb-carol list`](../../commands/ntsb-carol/list.md)   | the case count per period, exporting nothing                                                    |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntsb-carol`.
- [NTSB dockets](../ntsb-dockets/overview.md), [reports](../ntsb-reports/overview.md) and [avdata](../ntsb-avdata/overview.md).
