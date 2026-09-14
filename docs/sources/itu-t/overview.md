# ITU-T Recommendations

## Purpose

The ITU Telecommunication Standardization Sector publishes its Recommendations — the international telecommunication standards, series D to Z — through MyWorkspace, whose search API is open and whose public texts download without a login. `itu-t` pulls Recommendations by series and approval date, components (amendments, corrigenda, supplements) included.

## Scope

The texts the `searchRecs` API returns per series for an approval-date window (`--approved-from`, default 2023-01-01; `--approved-to` — a year past about 2030 is a 500), for the fourteen series the default run covers (D E F G H I J M Q T V X Y Z) or those given with `--series`; `--main-only` leaves out amendments, corrigenda, errata and supplements. Editions are immutable; new editions and components are added, and a prepublished text becomes public months after approval, so a re-pull with the same window picks up what was gated before. Prepublished (`-P`) and in-force ISO/IEC common texts are TIES-only: the download endpoint answers an HTML page with HTTP 200, which the magic check catches and logs.

## Types of data

Recommendation PDFs from `rec/dologin_pub.asp`, named `ITU-T <number> (<yyyy-mm>) [<component>] - <title>.pdf` under `<X>-Series - <series name>/`, with the dms id, recommendation name, title, approval date and status in the manifest; the API answers are kept in `_itut-api.json`.

## Commands

| Command                                             | Does                    |
| --------------------------------------------------- | ----------------------- |
| [`bulk itu-t fetch`](../../commands/itu-t/fetch.md) | pull the selected texts |
| [`bulk itu-t list`](../../commands/itu-t/list.md)   | the catalogue rows      |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.itu-t`.
- [itu-r](../itu-r/overview.md) — the Radiocommunication Sector's Recommendations.
