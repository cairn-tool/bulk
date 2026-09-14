# Fetching

Why the `fetch` commands exist: a document archive is only as good as the record of where each
file came from, and pulling a whole catalogue by hand — or with a loop of `curl` — produces files
without that record, stops on the first interruption, and accepts whatever the server sent. Every
`bulk <plugin> fetch` runs the same pipeline so that none of those happen.

```bash
bulk ntsb-reports list --mode Marine                      # what is there
bulk ntsb-reports fetch --mode Marine --dest ~/a/ntsb     # pull it
bulk ntsb-reports fetch --mode Marine --dest ~/a/ntsb     # again: everything present is skipped
```

## The pipeline

1. **Enumerate live.** The plugin fetches the source's own catalogue — a SharePoint list, an
   OAI-PMH feed, an Atom API, a server-rendered index page — and saves it verbatim in the
   destination. The catalogue snapshot is the lossless record; everything else is derived from it.
2. **Plan.** Each catalogue row becomes an item: a destination relative to the root, a URL, the
   expected byte count and digest when the catalogue states them, and the source's fields for the
   manifest. Names are stable (`<identifier> - <title>.<ext>`), collisions resolved with the
   source's own row id, never a counter.
3. **Manifest first.** `_manifest.tsv` is written before the first download, so a run that dies
   halfway still left an inventory.
4. **Pull and verify.** Each file streams to a `.part` file and is kept only if it verifies:
   HTTP 200, a non-empty body, the magic bytes for its type, the byte count when stated, the digest
   when stated. Anything else is deleted and logged with the reason.
5. **Log.** `_download-log.tsv` gets a row per attempt with the SHA-256 of what was kept.
6. **Resume.** A re-run skips what is present at its expected size and retries what failed.

## HTTP 200 does not mean success

This is the finding the whole verification step rests on, and every plugin's research has an
instance of it:

- NTSB's `docBLOB` answers **200 `application/pdf` with 0 bytes** when the `FileName` parameter
  does not match the catalogued name exactly.
- NTRL's own download action answers an **empty 200** — in a browser as well as from a script —
  so `ntis-ntrl` takes the document from the issuing agency instead.
- ITU-T's download endpoint answers a **TIES login page with HTTP 200** for prepublished and
  ISO/IEC common texts.
- A Cloudflare challenge is an **HTML page** where a PDF was expected; so is a viewer interstitial,
  a "document not found" page, and an expired signed URL.

Size does not mean success either: a truncated transfer has a plausible size, which is why the
byte count is compared to the catalogue's and the digest verified where the source states one.

## Pacing

Never parallel against one host. `--delay` between downloads (2 s by default), and on top of it
the host's own rate-limit headers, a declared floor for the hosts that publish none, and the
`Retry-After` a 429 or 503 asks for — see [rate limiting](rate-limiting.md). arXiv is the host to
respect most: a burst earns a block that outlasts any retry.

## User-Agents

Most hosts expect a browser's string and get one. Two Akamai-fronted hosts —
`repository.library.noaa.gov` and `www.nrc.gov/docs/` — deny the browser string sent from a
script (and a made-up one) but serve curl's own, so those plugins send `curl/8.x`. The polite
hosts — Crossref, Open Library, NTRS — get `bulk/<version> (mailto:<contact>)` from the
configured contact; Crossref rewards it with twice the rate budget.

## Host access findings

What the research established for the hosts the plugins talk to. The per-source pages under
[sources/](../sources.md) carry the full tables of requests made.

| Host                                            | Access                                                                                                                                                    | Recourse or note                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `www.ntsb.gov`, `data.ntsb.gov`                 | Open: SharePoint REST, a form POST with an antiforgery token, server-rendered pages, a JSON API, static links; Cloudflare in front but nothing challenged | The one trap is the 0-byte `docBLOB` above                                                   |
| `archive.org`, `web.archive.org`                | Open, anonymous; sha1 per file for items, no checksum for Wayback                                                                                         | `matchType` plus a trailing `*` in a CDX query matches nothing; a missing item is a 200 `{}` |
| `export.arxiv.org`                              | Open, **one request per 3 s**, a burst blocked for 20+ minutes with no `Retry-After`                                                                      | The PDF host `arxiv.org` is ordinary                                                         |
| `cds.cern.ch`                                   | `/oai2d` open; `/search`, `/record`, every file behind an Anubis proof-of-work                                                                            | Solved and cached; INSPIRE-HEP the no-solve fallback                                         |
| `e-publishing.cern.ch`                          | Open OJS: OAI-PMH and galley downloads                                                                                                                    | —                                                                                            |
| `api.crossref.org`                              | Open, key-less; the polite pool with a `mailto:`                                                                                                          | Its `x-rate-limit-*` headers drive pacing                                                    |
| `www.rfc-editor.org`                            | Open plain files, no limit met at 2 s                                                                                                                     | Five RFCs have no PDF rendering; the text is the fallback                                    |
| `www.itu.int`                                   | ITU-T: the MyWorkspace API and `dologin_pub.asp` open for public texts; ITU-R: series pages (Windows-1252) and plain files                                | TIES-only texts answer an HTML 200                                                           |
| `api.github.com`, `doi.org`, `nvlpubs.nist.gov` | Open; the NIST catalogue is a release asset, the DOI one redirect from the PDF                                                                            | —                                                                                            |
| `repository.library.noaa.gov`                   | Akamai denies the browser User-Agent, serves curl's own; `Accept: application/json` → 406                                                                 | Send `*/*`                                                                                   |
| `adams-search.nrc.gov`, `www.nrc.gov/docs`      | JSON search API anonymous; files served to curl's User-Agent only                                                                                         | `q` must be `""` with filters; `DocumentSize` is not the served size                         |
| `ntrl.ntis.gov`                                 | Catalogue open (a JSF session for paging); download returns an empty 200                                                                                  | Documents from OSTI and DTIC                                                                 |
| `ntrs.nasa.gov`                                 | Open citations API                                                                                                                                        | Withdrawn Apollo-era records are 404                                                         |
| `openlibrary.org`                               | Open books API, 20 ISBNs a request                                                                                                                        | —                                                                                            |
| `www.osti.gov`                                  | Open, key-less, documented API; full text on the same host                                                                                                | No rate limit advertised                                                                     |
| `research.fs.usda.gov`, `search.nal.usda.gov`   | Treesearch: Drupal pages, plain files, a sitemap; NAL Primo: key-less records                                                                             | The digitised collections behind Primo are closed                                            |

Hosts that block scripts outright — Cloudflare JavaScript challenges on `dl.acm.org`,
`pcisig.com` and the trade press, edge denies, CAPTCHA pages — have one recourse here:
[`archive-wayback`](../sources/archive-wayback/overview.md), which recovers a publisher's documents
from the Wayback Machine's snapshots.

## Fetched content is untrusted input

A PDF from a public repository can carry anything a PDF can. `bulk` never executes or renders what
it downloads; verify what you archive before opening it with software that runs embedded content.
