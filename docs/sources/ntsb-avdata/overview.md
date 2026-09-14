# NTSB aviation database dumps

## Purpose

`data.ntsb.gov/avdata/` is the downloadable form of the NTSB aviation accident database: Microsoft Access dumps of the whole database, rebuilt monthly, with the older schemas and the monthly deltas, for anyone who wants the data as tables rather than through CAROL. `ntsb-avdata` takes the listing and keeps every build as a dated copy.

## Scope

The files the directory page lists: `avall.zip` (the whole aviation database, ~96 MB, rebuilt monthly), `Pre2008.zip` and `PRE1982.zip` (the older schemas), twelve `upNNMMM.zip` monthly deltas, and the schema documents (data dictionary and ERD PDFs). Each row carries the file's date and byte count, so every download is verified against the listing and a rebuilt file (same name, new date and size) lands beside the previous copy. Byte ranges are ignored by the server, so every download is whole. **The page announces the dataset's replacement by the NTSB Enterprise API (`GetCasesByDateRangeV2` at developer.ntsb.gov) on 2027-04-05.**

## Types of data

ZIP archives of Access `.mdb` databases (events, aircraft, engines, findings, narratives, injuries, sequences — the full aviation schema), and PDF schema documents, named `<name> (<listed date>).<ext>`.

## Commands

| Command                                                         | Does                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`bulk ntsb-avdata fetch`](../../commands/ntsb-avdata/fetch.md) | pull every listed file, or `--only` / `--monthly` subsets, verified against the listed sizes |
| [`bulk ntsb-avdata list`](../../commands/ntsb-avdata/list.md)   | the directory listing                                                                        |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ntsb-avdata`.
- [CAROL](../ntsb-carol/overview.md) — the same data, case by case, through the API.
