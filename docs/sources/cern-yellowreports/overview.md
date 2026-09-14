# CERN Yellow Reports

## Purpose

The CERN Yellow Reports are the laboratory's monograph and school-proceedings series (CERN-yyyy-nnn): accelerator school lectures, detector and physics reports, and the proceedings of CERN's schools. They moved to an Open Journal Systems instance at `e-publishing.cern.ch`, which — unlike CDS — is not behind any bot challenge, and `cern-yellowreports` pulls the series' articles from its OAI-PMH feed.

## Scope

Every article the OJS OAI-PMH feed lists (169 as of 2026-09-14), with `--from`/`--until` on the OAI datestamp and `--report` to take one issue (report number). Only articles with a PDF galley are downloaded; the rest are counted.

## Types of data

Article PDFs, one per file, named `<report number>.<article tail> - <title>.pdf` under the report number, with the article DOI, the issue DOI (the report number), authors, date and the galley ids in the manifest. The feed pages are kept under `_oai/`.

## Commands

| Command                                                                       | Does                        |
| ----------------------------------------------------------------------------- | --------------------------- |
| [`bulk cern-yellowreports fetch`](../../commands/cern-yellowreports/fetch.md) | pull the articles           |
| [`bulk cern-yellowreports list`](../../commands/cern-yellowreports/list.md)   | the articles the feed lists |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.cern-yellowreports`.
- [cern-cds](../cern-cds/overview.md).
