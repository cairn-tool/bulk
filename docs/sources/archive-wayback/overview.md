# Wayback Machine

## Purpose

The Wayback Machine keeps snapshots of the web, and its CDX index lists every capture of a URL or URL pattern with its timestamp, MIME type, status and content digest. For a host that blocks scripts outright (a Cloudflare JavaScript challenge, an edge deny), a snapshot is the recourse: `archive-wayback` recovers the original bytes of documents the publisher itself will not serve. Verified against `pcisig.com`, which is permanently gated — its PDFs are still recoverable this way.

## Scope

One or more URLs or patterns (`--url 'host.com*' --match prefix`, or a file of them), filtered by MIME type, status and a capture-date window, collapsed to one row per distinct content digest; by default the newest capture per URL, with `--all-captures` every distinct capture. Files come from the `id_` raw form of the snapshot URL, so the bytes are the original document, not a rewritten page; there is no checksum, so files are verified by magic.

## Types of data

Whatever the captures are — usually PDFs and HTML pages — named `<host>/<path with slashes flattened>[ (<timestamp>)].<ext>`, with the extension taken from the URL or inferred from the MIME type. The run keeps every CDX row in `_cdx.tsv` (`urlkey, timestamp, original, mimetype, statuscode, digest, length`).

## Commands

| Command                                                                 | Does                               |
| ----------------------------------------------------------------------- | ---------------------------------- |
| [`bulk archive-wayback fetch`](../../commands/archive-wayback/fetch.md) | pull the snapshots                 |
| [`bulk archive-wayback list`](../../commands/archive-wayback/list.md)   | the captures the CDX index reports |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.archive-wayback`.
- [archive-items](../archive-items/overview.md).
- [Fetching](../../guide/fetching.md) — the host access table that names this as the recourse for blocked hosts.
