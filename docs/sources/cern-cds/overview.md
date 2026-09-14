# CERN Document Server

## Purpose

CDS is CERN's institutional repository — an Invenio instance holding the laboratory's reports, preprints, theses, books, proceedings, photographs and multimedia, most with full text. `cern-cds` pulls records and their files by OAI-PMH set, Invenio search or record id, solving the proof-of-work gate the server puts in front of its search and file routes.

## Scope

Records selected by `--set` (an OAI-PMH set — `cerncds:BOOK`, `cerncds:REPORT`, `cerncds:FULLTEXT`, `cerncds:SCAN`, 44 in all — with `--from`/`--until` datestamps), by `--query` (the documented search API, `/search?p=…&of=xm`), or by `--record`. Everything but `/oai2d` is behind an **Anubis** proof-of-work challenge; the plugin solves it once (a ~60 ms compute toll), caches the resulting cookie under the cache directory, and sends it on every gated request. `--no-anubis` leaves the gate alone and takes files from INSPIRE-HEP where INSPIRE holds them. Records are revised (the OAI datestamp); a re-pull with a `--from` window picks up what changed.

## Types of data

The files each MARC record's 856 fields name — usually PDFs, byte-exact against the listed size, with `?subformat=` derivatives (icons, PDF/A) skipped unless `--all-formats` — filed as `<set or query>/<report number or record id> - <title>/<file>`. The records themselves are kept as MARCXML under `_records/<id>.xml`; the manifest carries record id, report number (037/088), title (245), date (260/269), INSPIRE id (035) and the file's source (`cds` or `inspire`).

## Commands

| Command                                                   | Does                             |
| --------------------------------------------------------- | -------------------------------- |
| [`bulk cern-cds fetch`](../../commands/cern-cds/fetch.md) | pull the selected records' files |
| [`bulk cern-cds list`](../../commands/cern-cds/list.md)   | the records and their files      |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.cern-cds`.
- [cern-yellowreports](../cern-yellowreports/overview.md) — the Yellow Report series, on an open OJS site.
- [Bot challenges](../../guide/bot-challenges.md) — what solving Anubis means and where the cookie lives.
