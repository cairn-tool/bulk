# NTSB investigation reports library

## Purpose

The US National Transportation Safety Board investigates every civil aviation accident and the significant accidents in the other transportation modes, and for the major investigations adopts a **report** — the Aircraft/Marine/Highway/Railroad/Pipeline/Hazmat Accident Report (AAR, MAR, HAR, RAR, PAR, HZM) with its analysis, findings, probable cause and recommendations — or an Accident Brief. The reports library on `www.ntsb.gov/investigations/AccidentReports/` is the complete set of those adopted documents, and `ntsb-reports` pulls it whole, filed by mode.

## Scope

Every report and brief the SharePoint `Reports` list holds: 2,006 PDFs, 4.55 GB, as of 2026-09-13, from the 1960s (CAB-era reports carried over) to the current year. One anonymous REST call enumerates the whole list with each file's byte count, adopted date, accident date, report number and the CAROL key of the case. The list is not paged at its present size (the plugin warns if it ever is). Known defects at the source: the listed report number is occasionally mistyped onto the wrong file, so the file stem (`AAR0003`, `MIR2628`) is the key; one file is listed twice (`HAB1808.pdf` and `HAB1808 .pdf`, different bytes).

## Types of data

Adopted investigation reports and accident briefs as PDF, one per file, with the list's metadata in the manifest: mode(s), report number, NTSB accident id, CAROL `Mkey`, adopted and accident dates, title, last-modified time and the list row id. Files are named `<file stem> - <title>.pdf` and filed under `Aviation/`, `Marine/`, `Highway/`, `Railroad/`, `Pipeline/` or `Hazmat/` (a multi-mode report under its first mode; the few with no mode by their series prefix).

## Commands

| Command                                                           | Does                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`bulk ntsb-reports fetch`](../../commands/ntsb-reports/fetch.md) | pull every report, or a mode, verified against the list's byte counts |
| [`bulk ntsb-reports list`](../../commands/ntsb-reports/list.md)   | the catalogue rows, without downloading                               |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntsb-reports`.
- [NTSB dockets](../ntsb-dockets/overview.md), [CAROL](../ntsb-carol/overview.md) and [avdata](../ntsb-avdata/overview.md) — the other three NTSB systems.
