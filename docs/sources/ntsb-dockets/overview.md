# NTSB Docket Management System

## Purpose

An NTSB **docket** is the public factual record of an investigation: the group chairman factual reports, exhibits, photographs, interview transcripts, flight data and cockpit voice recorder reports, and the data and media files the investigators collected, released before the board adopts its report. The Docket Management System at `data.ntsb.gov/Docket` holds every docket the agency has published, and `ntsb-dockets` pulls named dockets or a slice of them, one folder per docket with every item.

## Scope

27,062 docket rows (27,052 distinct projects; 25,503 aviation) as of 2026-09-13, enumerated by one form POST. A docket page is server-rendered and lists every item with its title, page count, photo count, type and download link; a project with several sub-dockets (TWA 800 has eleven) appears once per sub-docket. Nothing is pulled without a selection — named dockets (`--ntsb-number`, `--project`) or a slice by office code, mode and accident-date window — because 27,000 dockets is a crawl, not a command. A re-pull never deletes: a docket whose item count fell since the last run is reported (USAir 427 went from 602 items to 11 online on 2026-06-09).

## Types of data

Every item of a docket as the file the docket serves — PDF factual reports and exhibits, ZIP data archives, images, audio and video, spreadsheets — named `<NNNN> - <title>.<ext>` under `<NTSB number> - <description>/[<sub-docket>/]`, with `(Redacted)` marked from the file name. Per docket the plugin keeps `_docket.html` (the page), `_docket.json` (Last Modified, Public Release Date, item counts per sub-docket, when it was fetched) and `_items.tsv`; the run's `_dockets.tsv` is the all-time docket list.

## Commands

| Command                                                           | Does                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`bulk ntsb-dockets fetch`](../../commands/ntsb-dockets/fetch.md) | pull the items of the selected dockets, verified by magic and a non-empty body  |
| [`bulk ntsb-dockets list`](../../commands/ntsb-dockets/list.md)   | the selected dockets — or, with a docket named, its items — without downloading |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntsb-dockets`.
- [NTSB reports](../ntsb-reports/overview.md), [CAROL](../ntsb-carol/overview.md) and [avdata](../ntsb-avdata/overview.md).
