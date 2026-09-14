# NOAA Institutional Repository

## Purpose

The NOAA Institutional Repository is the agency's open archive of NOAA-authored publications — journal articles, technical memoranda, technical reports, data reports and documents from every line office — with a documented JSON API that states each file's byte count and sha256. `noaa-ir` pulls collections whole, verified against both.

## Scope

One or more of the repository's collections by PID (`--collection`: 1 NEPA, 3 CRCP, 4 OER, 5 NMFS, 6 NWS, 7 OAR, 8 NOS, 9 NESDIS, 11 Sea Grant, 12 Education, 10031 General Documents, 11879 International Agreements, 16402 OMAO, 22022 IEA, 23649 Cooperative Institutes, 24914 Cooperative Science Centers, 23702 WRFIA, 44280 Deepwater Horizon), narrowed by `--type` (resource type) and a `--from`/`--until` window on the date the item was added. Items shared between collections are pulled once. The host denies a browser User-Agent sent from a script and serves curl's own, which is what the plugin sends; the export API answers 406 to `Accept: application/json`, so `*/*` is sent.

## Types of data

The attached document of every item that has one (`DS1`) — PDFs for the most part — named `<PID number> - <title>.<ext>` under `<Collection>/<year>/`, with PID, title, year, resource type, corporate names, date added, byte count, sha256, the file label and DOI in the manifest; the API answers are kept as `_noaa-<pid>.json`.

## Commands

| Command                                                 | Does                                       |
| ------------------------------------------------------- | ------------------------------------------ |
| [`bulk noaa-ir fetch`](../../commands/noaa-ir/fetch.md) | pull a collection's files, sha256-verified |
| [`bulk noaa-ir list`](../../commands/noaa-ir/list.md)   | the items with a file                      |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.noaa-ir`.
