# The RFC series (RFC Editor)

## Purpose

The RFC series is the IETF's document series — the Internet's standards, best current practices, informational and experimental documents — published by the RFC Editor. `ietf-rfc` pulls RFCs as the RFC Editor's own PDF renderings from a number range, or whatever a folder is missing.

## Scope

Every RFC in `rfc-index.xml` (9,836 published as of 2026-09-13, last RFC 10042; 188 numbers were never issued), selected by `--from`/`--to` number or `--missing-from` a folder that already holds `RFC <n> - …` files. RFCs are immutable once published and the index only grows, so a re-pull is `--from <last + 1>` or `--missing-from`.

## Types of data

One file per RFC: the RFC Editor's PDF rendering (`rfc/rfc<n>.pdf`, present for every RFC since 2019 and most earlier ones), else the text-as-PDF rendering (`rfc/pdfrfc/rfc<n>.txt.pdf`), else the plain text (`rfc/rfc<n>.txt`, saved as `.txt`) — five RFCs (219, 515, 571, 587, 4373) exist only as text. Named `RFC <n> - <title>` under `RFC N000-N999/`, with title, date, status and formats in the manifest.

## Commands

| Command                                                   | Does                                       |
| --------------------------------------------------------- | ------------------------------------------ |
| [`bulk ietf-rfc fetch`](../../commands/ietf-rfc/fetch.md) | pull the selected RFCs, with the fallbacks |
| [`bulk ietf-rfc list`](../../commands/ietf-rfc/list.md)   | the index rows selected                    |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.ietf-rfc`.
