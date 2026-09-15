---
name: sources
description: Pull a publisher's catalogue into a document archive, or resolve ISBNs, DOIs, accession numbers and report designations to catalogue records, with the bulk CLI — NTSB, arXiv, CERN, Crossref, NIST, NRC, NTIS, NASA, OSTI, USDA, ITU, the RFC series, Open Library and the Internet Archive. Use when asked to download, mirror or archive documents from one of these publishers, to enumerate what one publishes, or to look identifiers up.
---

# The bulk CLI

`bulk` is published as `@cairn-tool/bulk`. If `command -v bulk` finds nothing, say so and stop —
do not install it yourself and do not fall back to `npx`. Installing it is
`npm install -g @cairn-tool/bulk`.

## Shape

One plugin per data source: `bulk <plugin> fetch|list|query`. `fetch` pulls a catalogue into the
archive, `list` enumerates it without downloading, `query` turns identifiers into records.

- Every command takes `--format llm|human|json` (`-fh`/`-fj`); use `-fj` to extract a field.
- Exit `0` clean; `1` usage, configuration or catalogue error (nothing pulled); `2` one or more
  items failed or nothing found (the log says which — re-run to retry); `130` interrupted.
- Progress goes to **stderr**; stdout carries only the result.
- A fetch **requires** a destination: `--dest <dir>`, or `plugins.<id>.dest` in the
  configuration. It writes `_manifest.tsv` before the first download, verifies every file,
  logs every transfer to `_download-log.tsv`, and re-running the same command resumes.

## Working rules

- A catalogue can be gigabytes. Run `list`, or `fetch --dry-run --limit N`, first, and confirm
  with the user before a whole-catalogue pull.
- **Before the first command against a source, run `bulk <plugin> --docs` and read it.** It
  prints the source's overview, the access research — hosts, pacing, bot challenges, what fails
  and why — and every sub-command page, verbatim from the tool's documentation. `bulk --docs`
  prints the shared behaviour, configuration and guides; `bulk <plugin> <command> --help` the
  option list; `bulk sources` the list below with hosts.

## Sources

<!-- sources -->

- `archive-items` — Internet Archive items — files of the items matching a query, collection or identifier, sha1-verified; item records by identifier (fetch, list, query)
- `archive-wayback` — Wayback Machine — snapshots of URLs on hosts that block scripts; the recourse for a Cloudflare-gated publisher (fetch, list)
- `arxiv` — arXiv e-prints — papers by search, category or identifier; PDFs (or the submitted source), versioned (fetch, list)
- `cern-cds` — CERN Document Server — records by OAI-PMH set, Invenio query or id; the Anubis gate is solved so files come from CDS (fetch, list)
- `cern-yellowreports` — CERN Yellow Reports (e-publishing.cern.ch) — the CERN-yyyy-nnn series as article PDFs; open, no challenge (fetch, list)
- `crossref` — Crossref — the record for a DOI (title, authors, journal, date, publisher, licence, full-text links) (query)
- `ietf-rfc` — RFCs from the RFC Editor by number range or missing-from a folder; PDF with text fallbacks (fetch, list)
- `itu-r` — ITU-R Recommendations by series, crawled from the series pages; every edition, plain files (fetch, list)
- `itu-t` — ITU-T Recommendations by series and approval date via the MyWorkspace API; login-free download of the public texts (fetch, list)
- `nist-techpubs` — NIST/NBS Technical Series — SP, FIPS, NISTIR, TN, Circulars, Handbooks and the rest, by series, date or title; records by designation (fetch, list, query)
- `noaa-ir` — NOAA Institutional Repository — journal articles, technical memoranda and reports, by collection (JSON API, sha256-verified) (fetch, list)
- `nrc-adams` — NRC ADAMS public library — documents by accession number, docket, type, date range or free text (APS search API) (fetch, list)
- `ntis-ntrl` — NTIS National Technical Reports Library — records by search or accession number, with the full text taken from the issuing agency (fetch, list, query)
- `ntrs` — NASA Technical Reports Server — citation by accession number, or best match for a title (query)
- `ntsb-avdata` — NTSB aviation database dumps — avall.zip (monthly, 96 MB), Pre2008 / PRE1982, the monthly deltas and schema PDFs (fetch, list)
- `ntsb-carol` — NTSB CAROL case database — every case record (findings, narratives, probable cause) exported year by year, JSON and CSV (fetch, list)
- `ntsb-dockets` — NTSB accident dockets — every factual report, exhibit, photo and data file of an investigation; 27,000 dockets (fetch, list)
- `ntsb-reports` — NTSB investigation reports — every adopted report and brief, ~2,000 PDFs, 4.5 GB, filed by mode (fetch, list)
- `openlibrary` — Open Library records by ISBN — title, authors, date, publisher (query)
- `osti` — OSTI.GOV — DOE technical reports, journal articles and conference papers with full text, and records by report designation (fetch, list, query)
- `usda-nal` — USDA National Agricultural Library — AGRICOLA and PubAg records by title, author or identifier (query)
- `usda-treesearch` — Forest Service Treesearch — GTRs, Research Papers, station publications and FS-authored articles, by search or id (fetch, list)

<!-- /sources -->
