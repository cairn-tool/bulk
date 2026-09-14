# Data sources

One plugin per data system. Each source directory holds two pages, so a fact is always in the same
place:

- `overview.md` — **purpose** (what the body is and why it publishes), **scope** (what the plugin can
  select, its counts and sizes, what changes and what does not), **types of data** (the documents
  and records, how they are named and filed), and the commands.
- `access.md` — the access research: every entry point and its mechanism, how the catalogue is
  enumerated with its paging and caps, the file endpoint's failure modes found by sending it wrong
  input, `robots.txt`, rate limits and User-Agent findings, and a table of every request made.
  Written before the plugin, by making the requests rather than reading about them, and kept as it
  was written; the dates are the dates of the probes.

Every page describes **observed behaviour against the live host**, not a vendor specification. Where
a fact was established by measurement — an endpoint that answers a 0-byte 200, a host that denies
one User-Agent and serves another, a rate limit with no `Retry-After` — the page says so and says
how it was established.

## The sources

| Plugin                                                         | What it is                                                                                                                            | Hosts                                                                                                  | Research                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [`archive-items`](sources/archive-items/overview.md)           | Internet Archive items — files of the items matching a query, collection or identifier, sha1-verified; item records by identifier     | archive.org                                                                                            | [access](sources/archive-items/access.md)      |
| [`archive-wayback`](sources/archive-wayback/overview.md)       | Wayback Machine — snapshots of URLs on hosts that block scripts; the recourse for a Cloudflare-gated publisher                        | web.archive.org                                                                                        | [access](sources/archive-wayback/access.md)    |
| [`arxiv`](sources/arxiv/overview.md)                           | arXiv e-prints — papers by search, category or identifier; PDFs (or the submitted source), versioned                                  | export.arxiv.org, arxiv.org                                                                            | [access](sources/arxiv/access.md)              |
| [`cern-cds`](sources/cern-cds/overview.md)                     | CERN Document Server — records by OAI-PMH set, Invenio query or id; the Anubis gate is solved so files come from CDS                  | cds.cern.ch, inspirehep.net                                                                            | [access](sources/cern-cds/access.md)           |
| [`cern-yellowreports`](sources/cern-yellowreports/overview.md) | CERN Yellow Reports (e-publishing.cern.ch) — the CERN-yyyy-nnn series as article PDFs; open, no challenge                             | e-publishing.cern.ch                                                                                   | [access](sources/cern-yellowreports/access.md) |
| [`crossref`](sources/crossref/overview.md)                     | Crossref — the record for a DOI (title, authors, journal, date, publisher, licence, full-text links)                                  | api.crossref.org                                                                                       | [access](sources/crossref/access.md)           |
| [`ietf-rfc`](sources/ietf-rfc/overview.md)                     | RFCs from the RFC Editor by number range or missing-from a folder; PDF with text fallbacks                                            | www.rfc-editor.org                                                                                     | [access](sources/ietf-rfc/access.md)           |
| [`itu-r`](sources/itu-r/overview.md)                           | ITU-R Recommendations by series, crawled from the series pages; every edition, plain files                                            | www.itu.int                                                                                            | [access](sources/itu-r/access.md)              |
| [`itu-t`](sources/itu-t/overview.md)                           | ITU-T Recommendations by series and approval date via the MyWorkspace API; login-free download of the public texts                    | www.itu.int                                                                                            | [access](sources/itu-t/access.md)              |
| [`nist-techpubs`](sources/nist-techpubs/overview.md)           | NIST/NBS Technical Series — SP, FIPS, NISTIR, TN, Circulars, Handbooks and the rest, by series, date or title; records by designation | api.github.com, github.com, objects.githubusercontent.com, doi.org, nvlpubs.nist.gov, api.crossref.org | [access](sources/nist-techpubs/access.md)      |
| [`noaa-ir`](sources/noaa-ir/overview.md)                       | NOAA Institutional Repository — journal articles, technical memoranda and reports, by collection (JSON API, sha256-verified)          | repository.library.noaa.gov                                                                            | [access](sources/noaa-ir/access.md)            |
| [`nrc-adams`](sources/nrc-adams/overview.md)                   | NRC ADAMS public library — documents by accession number, docket, type, date range or free text (APS search API)                      | adams-search.nrc.gov, www.nrc.gov                                                                      | [access](sources/nrc-adams/access.md)          |
| [`ntis-ntrl`](sources/ntis-ntrl/overview.md)                   | NTIS National Technical Reports Library — records by search or accession number, with the full text taken from the issuing agency     | ntrl.ntis.gov, www.osti.gov, apps.dtic.mil                                                             | [access](sources/ntis-ntrl/access.md)          |
| [`ntrs`](sources/ntrs/overview.md)                             | NASA Technical Reports Server — citation by accession number, or best match for a title                                               | ntrs.nasa.gov                                                                                          | [access](sources/ntrs/access.md)               |
| [`ntsb-avdata`](sources/ntsb-avdata/overview.md)               | NTSB aviation database dumps — avall.zip (monthly, 96 MB), Pre2008 / PRE1982, the monthly deltas and schema PDFs                      | data.ntsb.gov                                                                                          | [access](sources/ntsb-avdata/access.md)        |
| [`ntsb-carol`](sources/ntsb-carol/overview.md)                 | NTSB CAROL case database — every case record (findings, narratives, probable cause) exported year by year, JSON and CSV               | data.ntsb.gov                                                                                          | [access](sources/ntsb-carol/access.md)         |
| [`ntsb-dockets`](sources/ntsb-dockets/overview.md)             | NTSB accident dockets — every factual report, exhibit, photo and data file of an investigation; 27,000 dockets                        | data.ntsb.gov                                                                                          | [access](sources/ntsb-dockets/access.md)       |
| [`ntsb-reports`](sources/ntsb-reports/overview.md)             | NTSB investigation reports — every adopted report and brief, ~2,000 PDFs, 4.5 GB, filed by mode                                       | www.ntsb.gov                                                                                           | [access](sources/ntsb-reports/access.md)       |
| [`openlibrary`](sources/openlibrary/overview.md)               | Open Library records by ISBN — title, authors, date, publisher                                                                        | openlibrary.org                                                                                        | [access](sources/openlibrary/access.md)        |
| [`osti`](sources/osti/overview.md)                             | OSTI.GOV — DOE technical reports, journal articles and conference papers with full text, and records by report designation            | www.osti.gov                                                                                           | [access](sources/osti/access.md)               |
| [`usda-nal`](sources/usda-nal/overview.md)                     | USDA National Agricultural Library — AGRICOLA and PubAg records by title, author or identifier                                        | search.nal.usda.gov                                                                                    | [access](sources/usda-nal/access.md)           |
| [`usda-treesearch`](sources/usda-treesearch/overview.md)       | Forest Service Treesearch — GTRs, Research Papers, station publications and FS-authored articles, by search or id                     | research.fs.usda.gov                                                                                   | [access](sources/usda-treesearch/access.md)    |

## Where a source's behaviour is declared

A plugin's hosts and their policies — which User-Agent they need, a declared pacing floor, a bot
challenge to solve — live in `src/plugins/<id>/manifest.ts` and are published by
[`bulk sources --format json`](commands/sources.md). The parsers that read each source's catalogue
are in `src/plugins/<id>/parse.ts`, fixture-tested against trimmed real responses under
`tests/fixtures/sources/<host>/`.

## Related

- [Complete command listing](commands.md)
- [Fetching](guide/fetching.md) — the pipeline every fetch plugin runs through.
- [Writing a plugin](guide/writing-a-plugin.md) — adding a source.
- [Candidate sources](_candidate-sources.md) — hosts probed once and not yet plugins.
