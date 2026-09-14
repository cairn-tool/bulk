# NIST/NBS Technical Series — access research

What was established, by making the requests rather than reading about them, before the `nist-techpubs` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

Probed 2026-09-14. Everything below was run and its answer recorded;
nothing is inferred from documentation alone.

## What NIST publishes, and where

NIST (and the National Bureau of Standards before it) issues its work as
the **NIST Technical Series** — Special Publications, FIPS, Interagency
and Internal Reports, Technical Notes, Handbooks, Monographs, Circulars,
Letter Circulars, Building Science Series and about forty more. The
documents live on `nvlpubs.nist.gov`; the catalogue lives on GitHub.

| Host                                                 | What it serves                                                | Answer             |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------------------ |
| `github.com/usnistgov/NIST-Tech-Pubs`                | The Research Library's catalogue exports, as monthly releases | Open               |
| `raw.githubusercontent.com/usnistgov/NIST-Tech-Pubs` | Per-record RIS and BibTeX files on the `nist-pages` branch    | Open               |
| `nvlpubs.nist.gov`                                   | The PDFs                                                      | Open, plain files  |
| `doi.org`                                            | `10.6028/…` → the PDF                                         | Open, one redirect |
| `api.crossref.org`                                   | The NIST DOI records                                          | Open, polite pool  |

## The catalogue

`usnistgov/NIST-Tech-Pubs` is maintained by the NIST Research Library.
Its default branch is `nist-pages`, and its **releases** carry the
catalogue:

```text
GET https://api.github.com/repos/usnistgov/NIST-Tech-Pubs/releases/latest
  -> tag Aug2026, published 2026-09-08
     allrecords.xml        173,856,278 bytes   MARCXML, exported from Alma
     allrecords-MODS.xml    84,427,228 bytes   the same, transformed to MODS 3.7
     readme.txt                  3,568 bytes
```

Releases go back monthly (`Aug2026`, `July2026`, `June2026`, …). The
command takes **allrecords-MODS.xml** — the same records as the MARCXML,
half the size, and with the fields already named.

The repository's own readme states the provenance: exported from the
ExLibris Alma catalogue by the Research Library cataloguing team,
transformed with `BIBLIOMARC21_to_MARC21XML.xsl` and
`MARC21slim2MODS3-7.xsl`, QC'd by their metadata librarian. Citation:
NIST Research Library (2024), _NIST Technical Series Publication
Metadata_, <https://doi.org/10.18434/M32192>. No use restrictions
declared.

### What a MODS record carries

Verified against the first records of the Aug2026 file:

```xml
<mods version="3.7">
  <titleInfo><title>NIST Measurement Assurance Program for Resistance</title></titleInfo>
  <name type="personal" usage="primary"><namePart>Boynton, Paul A.</namePart></name>
  <name type="corporate" xlink:href="https://id.loc.gov/authorities/names/n79021148">
    <namePart>United States.</namePart><namePart>National Bureau of Standards.</namePart></name>
  <genre authority="marcgt">technical report</genre>
  <originInfo><dateIssued encoding="marc">1997</dateIssued></originInfo>
  <subject authority="lcsh" xlink:href="…"><topic>Electric resistance</topic>…</subject>
  <location><url displayLabel="electronic resource">https://doi.org/10.6028/NIST.TN.1424</url></location>
  <relatedItem type="series"><titleInfo><title>NIST technical note; NIST tech note; NIST TN</title>
    <partNumber>1424</partNumber></titleInfo></relatedItem>
  <identifier type="doi">10.6028/NIST.TN.1424 </identifier>
  <identifier type="oclc">929067784</identifier>
</mods>
```

Note the trailing space inside `<identifier type="doi">` — real, and
stripped by the parser.

### The designation is the DOI suffix

Every record's DOI is `10.6028/` plus the publication's designation with
dots for spaces: `10.6028/NIST.SP.800-53r5` is NIST SP 800-53r5. That is
what gives the series folder and the file name without a lookup table.

The `bib/` directory on `nist-pages` holds one RIS file per record, which
is an independent enumeration of the designation space:

```text
GET https://api.github.com/repos/usnistgov/NIST-Tech-Pubs/git/trees/nist-pages?recursive=1
  -> 20,198 entries, not truncated; 20,020 of them bib/*.ris
```

Tabulated, that is 174 series. The largest:

| Series      | Records | Series                   | Records   |
| ----------- | ------- | ------------------------ | --------- |
| `NIST.IR`   | 4,520   | `NBS.SP`                 | 1,046     |
| `NBS.IR`    | 3,413   | `NBS.CIRC`               | 863       |
| `NBS.RPT`   | 1,792   | `NIST.TN`                | 846       |
| `NIST.SP`   | 1,686   | `NBS.CS`                 | 326       |
| `NBS.TN`    | 1,315   | `NBS.MP`                 | 298       |
| `NBS.LCIRC` | 1,124   | `NBS.FIPS` · `NIST.FIPS` | 217 · 123 |

with `NBS.CRPL-F-A`, `NBS.BRPD-CRPL-D`, `NBS.MONO`, `NBS.HB`, `NIST.HB`,
`NBS.BSS`, `NBS.BMS`, `NIST.GCR`, `NIST.AMS`, `NBS.NSRDS`, `NIST.CSWP`,
`NIST.NCSTAR`, `NBS.BH` and the rest below that. The MODS file parsed
20,381 records, slightly more than the RIS count, so the RIS directory
lags the release a little; the release is what the command reads.

## Getting a document

The DOI resolves in one hop:

```text
GET https://doi.org/10.6028/NIST.SP.800-53r5
  -> 200 application/pdf 6,073,678 bytes
     https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
```

The nvlpubs path differs by series (`SpecialPublications/`, `Legacy/circ/`,
`ir/…`), which is exactly why the DOI is used rather than a constructed
URL. Both hosts answer a browser User-Agent; no cookie, token or
challenge is involved.

Verified downloads on 2026-09-14:

| Designation      | Landed at                                                  | Bytes     | Magic   |
| ---------------- | ---------------------------------------------------------- | --------- | ------- |
| NIST FIPS 140-3  | `nvlpubs.nist.gov/nistpubs/FIPS/…`                         | 310,556   | `%PDF-` |
| NIST SP 800-53r5 | `nvlpubs.nist.gov/nistpubs/SpecialPublications/…`          | 6,073,678 | `%PDF-` |
| NBS CIRC 564     | `nvlpubs.nist.gov/nistpubs/Legacy/circ/nbscircular564.pdf` | —         | —       |

## Looking one record up

Crossref holds the NIST DOIs, so a single designation needs no 80 MB
download:

```text
GET https://api.crossref.org/works/10.6028/NIST.SP.800-53r5   -> 200
GET https://api.crossref.org/works/10.6028/NBS.BH.10          -> 200  (1920s NBS)
GET https://api.crossref.org/works/10.6028/NBS.CIRC.564        -> 200  (1955)
GET https://api.crossref.org/works/10.6028/NBS.LCIRC.1         -> 200
```

`type` is `report`, `institution` names NIST and the issuing laboratory.
Some titles are stored with the subtitle's colon already attached
("Circular of the Bureau of Standards no. 564:"), which the command
trims before appending the subtitle.

Requests carry a `mailto:` User-Agent for Crossref's polite pool, so the
advertised rate limit paces them automatically
([../../../lib/_index.md](../../guide/fetching.md)).

The per-record RIS files were tried too and work
(`bib/NIST.SP.800-53r5.ris` → 214 bytes of RIS), but the file names are
not uniformly spelled — `NBS BH 10.ris` with spaces alongside
`NBS.BH.10.ris`, `nist.ir.8011-4.ris` in lower case — and
`raw.githubusercontent.com` is case-sensitive, so Crossref is the route
the command takes.

## Not wired up

`services.nvd.nist.gov/rest/json/cves/2.0` (the National Vulnerability
Database) answered 200 for `cveId=CVE-2021-44228`, and `data.nist.gov/rmm`
answered 200 as well. Both are open, key-less NIST APIs — but they serve
vulnerability records and research datasets, not documents, so neither
belongs in a fetch command for the publication series. Noted here so the
next probe does not have to repeat it.

`csrc.nist.gov` has no JSON publication feed at the paths tried
(`/csrc/media/feeds/metanorma/pubs-export.json`, the NUDP services path)
— both 404. `www.nist.gov/jsonapi` is 404 as well. The GitHub catalogue
covers the same publications, so nothing is lost.

## Requests made

| When       | Request                                                             | Answer                                                     |
| ---------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2026-09-14 | `GET www.nist.gov/publications`                                     | 200 text/html                                              |
| 2026-09-14 | `GET nvlpubs.nist.gov/…/NIST.SP.800-53r5.pdf`                       | 200 application/pdf, 6,073,678                             |
| 2026-09-14 | `GET csrc.nist.gov/publications/search`                             | 200 text/html (no API behind it)                           |
| 2026-09-14 | `GET services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228` | 200 application/json                                       |
| 2026-09-14 | `GET data.nist.gov/rmm/records`                                     | 200 application/json                                       |
| 2026-09-14 | `GET api.github.com/repos/usnistgov/NIST-Tech-Pubs`                 | 200, default branch `nist-pages`                           |
| 2026-09-14 | `GET …/releases?per_page=3`                                         | 200, Aug2026 / July2026 / June2026 with the two XML assets |
| 2026-09-14 | `GET …/git/trees/nist-pages?recursive=1`                            | 200, 20,198 entries, `truncated: false`                    |
| 2026-09-14 | `GET …/releases/download/Aug2026/allrecords-MODS.xml` (range)       | 206, MODS 3.7 as above                                     |
| 2026-09-14 | `GET …/releases/download/Aug2026/allrecords-MODS.xml` (whole)       | 200, 80.5 MB, 20,381 records parsed                        |
| 2026-09-14 | `GET doi.org/10.6028/NIST.SP.800-53r5`                              | 200 application/pdf at nvlpubs                             |
| 2026-09-14 | `GET api.crossref.org/works/10.6028/…` ×5                           | 200 ×4, 404 for the misspelled `NBS.TN.1297`               |
