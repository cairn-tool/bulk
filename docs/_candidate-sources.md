# Candidate Sources

Public sources that could become `bulk <plugin> fetch` or `bulk <plugin> query` commands.
Compiled 2026-09-14 as a review list — **none of these is access
research**. A row here says a host answered a request on one day, not
that its catalogue can be enumerated, that its files verify, or that
scripted use is welcome. Promoting a row to a source means doing the
probe the [standards](standards.md) require and writing it up as
`sources/<plugin>/access.md`, the way the sources already in
[sources.md](sources.md) were done.

The archive's existing weight is engineering, science, computing and
electronics, aerospace, nuclear and military, so the list is ordered with
that in mind rather than alphabetically. Datasets are included alongside
documents, as asked — they need a different command shape (a dataset is
usually one large periodic file or a paged API, not a catalogue of PDFs),
which is noted where it applies.

## How to read the tables

**Probed** is what a single `curl -sSL` with a browser User-Agent got on
2026-09-14:

| Mark  | Meaning                                                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200` | The endpoint answered with what looks like the right content type                                                                                                                   |
| `key` | Answered `401`/`403` in a way that says _register for a free key_, not _go away_                                                                                                    |
| `403` | Refused this request — could be a UA policy, a CDN, or a real block; needs the `PLAIN_UA` and Wayback checks [the fetching guide](guide/fetching.md#host-access-findings) describes |
| `?`   | Did not answer cleanly, or the URL I tried was wrong — the source may still be fine                                                                                                 |
| `—`   | Not probed                                                                                                                                                                          |

**Shape** is the rough work a command would be:

| Mark    | Meaning                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `api`   | A JSON/XML API that pages — the shape most existing commands use                                                          |
| `bulk`  | One or a few large periodic files (a dump, a release asset) — like `bulk nist-techpubs fetch` or `bulk ntsb-avdata fetch` |
| `oai`   | OAI-PMH, resumption tokens — like `bulk cern-cds fetch`                                                                   |
| `index` | A static file listing or sitemap to walk — like `bulk ietf-rfc fetch`                                                     |
| `html`  | Server-rendered pages to parse — like `bulk usda-treesearch fetch`                                                        |

---

## A. Government and agency technical reports

The closest relatives of what is already here (OSTI, NIST, NTIS, NTSB,
NRC, NOAA).

| Source                          | Entry point                                 | What it holds                                                                                                                                                                                   | Shape    | Probed                                                                   |
| ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| **DTIC**                        | `discover.dtic.mil`                         | The Defense Technical Information Center — the `AD…` collection, ~1M defense-sponsored technical reports back to WWII. Already the named fallback for NTIS `AD…` accessions                     | html/api | `200` (the host was under maintenance during the NTIS probe; it is back) |
| **NASA NTRS**                   | `ntrs.nasa.gov/api/citations/search`        | ~1.5M aerospace reports, contractor reports, conference papers, Apollo/Shuttle/ISS documentation. **Already a `bulk query` service** — the fetch half is missing, and NTRS serves PDFs directly | api      | `200`                                                                    |
| **USGS Publications Warehouse** | `pubs.usgs.gov/pubs-services/publication/`  | Every USGS series — Professional Papers, Water-Supply Papers, Open-File Reports, Circulars, Bulletins — ~170k records, most with free PDFs                                                      | api      | `200`                                                                    |
| **GovInfo (GPO)**               | `api.govinfo.gov/collections`               | The authenticated federal record: Federal Register, CFR, US Code, Congressional Record, bills, hearings, GAO reports, court opinions. Has a documented bulk-data side as well as the API        | api/bulk | `key`                                                                    |
| **Federal Register**            | `federalregister.gov/api/v1/documents.json` | Every rule, proposed rule and notice since 1994, with full text and agency metadata. No key                                                                                                     | api      | `200`                                                                    |
| **eCFR**                        | `ecfr.gov/api/versioner/v1`                 | The Code of Federal Regulations as structured XML, with every historical version. No key                                                                                                        | api      | `200`                                                                    |
| **EPA NSCEP / Envirofacts**     | `data.epa.gov/efservice`                    | EPA's National Service Center for Environmental Publications, plus the Envirofacts data services over TRI, RCRA, SDWIS                                                                          | api      | `200` (Envirofacts)                                                      |
| **National Academies Press**    | `nap.nationalacademies.org`                 | ~15k consensus reports on engineering, aeronautics, nuclear safety, computing policy — all free PDFs since 2011. No API found; the record pages are server-rendered                             | html     | `200`                                                                    |
| **GAO**                         | `gao.gov/reports-testimonies`               | Audit and evaluation reports, many on weapon-system acquisition and federal IT — directly relevant to the military side of the archive                                                          | html     | `403` — refused this request; check `PLAIN_UA` and Wayback               |
| **CRS Reports**                 | `crsreports.congress.gov`                   | Congressional Research Service reports — the best short technical/policy summaries the US government produces                                                                                   | html     | `403` — and `everycrsreport.com` is the standard mirror to try           |
| **Congress.gov**                | `api.congress.gov/v3`                       | Bills, committee reports, the Congressional Record                                                                                                                                              | api      | `key`                                                                    |
| **Regulations.gov**             | `api.regulations.gov/v4`                    | Rulemaking dockets and every public comment — the regulatory analogue of an NTSB docket                                                                                                         | api      | `key`                                                                    |

## B. Scholarly literature and preprints

| Source                | Entry point                             | What it holds                                                                                                                                                                    | Shape    | Probed                             |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| **OpenAlex**          | `api.openalex.org`                      | The open successor to Microsoft Academic Graph — ~250M works, authors, institutions, citations, with open-access PDF locations. No key; a full monthly snapshot is published too | api/bulk | `200`                              |
| **INSPIRE-HEP**       | `inspirehep.net/api/literature`         | High-energy physics literature and its full texts. **Already used as the CDS fallback** in `bulk cern-cds fetch`; deserves to be a source in its own right                       | api      | `200`                              |
| **CERN Open Data**    | `opendata.cern.ch/api/records`          | LHC experiment datasets, analysis software and documentation — distinct from CDS, which is the document server                                                                   | api      | `200`                              |
| **Zenodo**            | `zenodo.org/api/records`                | CERN-run general repository: datasets, software releases, preprints, reports; everything has a DOI                                                                               | api      | `200`                              |
| **PubMed Central**    | `eutils.ncbi.nlm.nih.gov/entrez/eutils` | ~10M biomedical articles, ~5M open-access full texts; the E-utilities are the long-standing standard and there is an OA bulk package service                                     | api/bulk | `200`                              |
| **DOAJ**              | `doaj.org/api/search`                   | ~20k open-access journals and ~10M article records — useful for deciding whether a citation has a free copy                                                                      | api      | `200`                              |
| **Semantic Scholar**  | `api.semanticscholar.org/graph/v1`      | ~200M papers with citation graph, abstracts and open-access links; a bulk datasets API as well                                                                                   | api/bulk | `200` (rate-limited without a key) |
| **bioRxiv / medRxiv** | `api.biorxiv.org/details`               | Preprint metadata with full-text links                                                                                                                                           | api      | `200`                              |
| **CORE**              | `api.core.ac.uk/v3`                     | Aggregates ~300M open-access papers from repositories worldwide, with the PDFs                                                                                                   | api      | `key`                              |
| **NASA ADS**          | `api.adsabs.harvard.edu/v1`             | The astrophysics and planetary-science bibliography, with scanned historical literature                                                                                          | api      | `key` (free token)                 |
| **OSF**               | `api.osf.io/v2`                         | Open Science Framework projects, preprints and files                                                                                                                             | api      | `?` (timed out; retry)             |
| **HAL**               | `api.archives-ouvertes.fr`              | The French national open repository — CNRS, CEA, ONERA reports and theses                                                                                                        | api      | `—`                                |

## C. Standards bodies

The archive already has IETF and ITU. These are the other open ones, and
they are unusually good candidates because standards are stable,
numbered and enumerable.

| Source                      | Entry point                                                    | What it holds                                                                                                                                                                                     | Shape | Probed                                                                                                            |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| **3GPP**                    | `3gpp.org/ftp/Specs/archive/`                                  | **Every 3GPP specification, openly.** The whole GSM/UMTS/LTE/5G series by number and release, as a plain directory tree — no login, no API needed. A very close match to the IETF command's shape | index | `200`                                                                                                             |
| **ETSI**                    | `etsi.org/deliver/etsi_ts/`                                    | Every ETSI deliverable (TS, TR, EN, ES) as a numbered directory tree, free PDFs — including the 3GPP specs in ETSI numbering, DECT, NFV, TETRA                                                    | index | `200`; a specific TS PDF fetched cleanly (1.8 MB `application/pdf`)                                               |
| **IETF Datatracker**        | `datatracker.ietf.org/api/v1`                                  | The rest of the IETF beyond published RFCs: every Internet-Draft and revision, working groups, charters, ballots. Complements `bulk ietf-rfc fetch`                                               | api   | `200`                                                                                                             |
| **ECMA International**      | `ecma-international.org/publications-and-standards/standards/` | ECMA-262 (JavaScript), ECMA-404 (JSON), ECMA-48, the CD/DVD and character-set standards — all free, all numbered                                                                                  | index | `200`                                                                                                             |
| **Unicode**                 | `unicode.org/Public/`                                          | Every Unicode version's character database, UAX/UTS/UTR technical reports, CLDR — a plain, versioned directory tree                                                                               | index | `200`                                                                                                             |
| **Khronos**                 | `registry.khronos.org`                                         | OpenGL, Vulkan, OpenCL, SPIR-V, glTF specifications and their XML registries                                                                                                                      | index | `200`                                                                                                             |
| **RISC-V**                  | `github.com/riscv/riscv-isa-manual` releases                   | The ISA manuals and the ratified extension specifications, as GitHub release assets — the same shape as `bulk nist-techpubs fetch`                                                                | bulk  | `200`                                                                                                             |
| **The Open Group**          | `pubs.opengroup.org/onlinepubs/`                               | POSIX / Single UNIX Specification, free online                                                                                                                                                    | html  | `200`                                                                                                             |
| **DoD ASSIST**              | `quicksearch.dla.mil`                                          | **MIL-STD, MIL-SPEC, MIL-HDBK, MIL-PRF** — the whole active and cancelled defense specification set, free                                                                                         | html  | `200`                                                                                                             |
| **IEC Webstore**            | `webstore.iec.ch`                                              | Mostly paid, but a set of standards is published free; worth mapping which                                                                                                                        | html  | `200`                                                                                                             |
| **IEEE GET Program**        | `ieeexplore.ieee.org/browse/standards/get-program`             | The IEEE 802 series and selected others, free with registration                                                                                                                                   | html  | `200`                                                                                                             |
| **Bluetooth SIG**           | `bluetooth.com/specifications/specs/`                          | The Core Specification and every profile, free                                                                                                                                                    | html  | `200`                                                                                                             |
| **W3C**                     | `w3.org/TR/`                                                   | Every Recommendation, Working Draft and Note                                                                                                                                                      | index | `403` to this request — the TR index is a well-known open resource, so this is likely UA policy; check `PLAIN_UA` |
| **JEDEC**                   | `jedec.org/standards-documents`                                | DDR, LPDDR, HBM, JESD thermal and packaging standards — free but behind registration                                                                                                              | html  | `403`                                                                                                             |
| **Trusted Computing Group** | `trustedcomputinggroup.org/resources/`                         | TPM specifications, Opal/SED storage security                                                                                                                                                     | html  | `403`                                                                                                             |
| **Open Compute Project**    | `opencompute.org/documents`                                    | Server, rack, NIC and storage designs — the most detailed public data-centre hardware documentation                                                                                               | html  | `403`                                                                                                             |

Already recorded as **open** in the [host table](guide/fetching.md#host-access-findings)
and not yet commands: `snia.org`, `uefi.org`, `nvmexpress.org`,
`computeexpresslink.org` (its whole specification set sits under
`/wp-content/uploads/`), `dmtf.org` (asset path only). Already recorded
as **blocked**: `pcisig.com` (Cloudflare — the Wayback command recovers
its PDFs), `dl.acm.org`, `iso.org` (`403` here too).

## D. Military and defence

Given the Army TOE and STRATCOM work already in the repo, this group is
probably the highest-value gap.

| Source                                 | Entry point                    | What it holds                                                                                                                                              | Shape    | Probed |
| -------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| **Army Publishing Directorate**        | `armypubs.army.mil`            | **Field Manuals, Technical Manuals, Army Regulations, DA Pamphlets, TOE/MTOE references** — the authoritative Army publication set, free PDFs              | html     | `200`  |
| **DTIC**                               | `discover.dtic.mil`            | See §A — the single largest defense technical report collection                                                                                            | html/api | `200`  |
| **CIA FOIA Reading Room**              | `cia.gov/readingroom/`         | CREST — ~13M pages of declassified documents, including the Cold War technical and imagery intelligence series                                             | html     | `200`  |
| **National Security Archive**          | `nsarchive.gwu.edu`            | The GWU collection of declassified documents — nuclear planning (SIOP), crises, intelligence estimates. Directly relevant to the STRATCOM target-base work | html     | `200`  |
| **Government Attic**                   | `governmentattic.org`          | FOIA releases nobody else hosts — agency histories, technical manuals, internal studies                                                                    | index    | `200`  |
| **Naval History and Heritage Command** | `history.navy.mil`             | Ship histories, design studies, action reports                                                                                                             | html     | `200`  |
| **Combined Arms Research Library**     | `cgsc.contentdm.oclc.org`      | Fort Leavenworth's digital library — doctrine history, monographs, after-action reports. ContentDM has an OAI/IIIF API                                     | oai      | `200`  |
| **Air Force e-Publishing**             | `e-publishing.af.mil`          | AFIs, AFMANs, technical orders                                                                                                                             | html     | `403`  |
| **Joint Electronic Library**           | `jcs.mil/Doctrine/`            | Joint Publications (JP 3-x series)                                                                                                                         | html     | `403`  |
| **Army Center of Military History**    | `history.army.mil`             | The Green Books, lineage and honors, organisational histories                                                                                              | html     | `403`  |
| **NATO STO**                           | `sto.nato.int/publications/`   | AGARD and RTO/STO technical reports — a large aerospace engineering series                                                                                 | html     | `403`  |
| **FAS**                                | `sgp.fas.org`, `fas.org/nuke/` | The Federation of American Scientists' nuclear and secrecy collections, plus a CRS mirror                                                                  | html     | `—`    |

The `403`s here are worth one careful re-probe each: several US military
sites front on CDNs that deny a browser UA sent from curl, which is
exactly the `PLAIN_UA` case NOAA and NRC turned out to be.

## E. Patents

| Source                       | Entry point                             | What it holds                                                                                                | Shape    | Probed                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **USPTO**                    | `developer.uspto.gov`, `data.uspto.gov` | Full-text grants and applications back to 1790 (images) / 1976 (text), assignments, PTAB decisions, bulk XML | api/bulk | `?` — every USPTO host I tried returned the same generic 20,666-byte page, and `bulkdata.uspto.gov` and `search.patentsview.org` do not resolve. USPTO reorganised its data services; **this needs a real probe before anything is built** |
| **EPO Open Patent Services** | `ops.epo.org/3.2/rest-services`         | European and worldwide patent families, legal status, full text                                              | api      | `key` (OAuth)                                                                                                                                                                                                                              |
| **Google Patents**           | BigQuery public dataset                 | The same corpus, pre-parsed, queryable — but needs a Google Cloud account                                    | bulk     | `—`                                                                                                                                                                                                                                        |

## F. Libraries, archives and digitised collections

| Source                            | Entry point                             | What it holds                                                                                                                                                                                                                                                       | Shape    | Probed                                                                                                                         |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Bitsavers**                     | `bitsavers.org/pdf/`                    | **The computer documentation archive** — manuals, schematics, and internal design documents for essentially every pre-1995 computer and peripheral, by manufacturer. A plain directory tree, and the single best match for the computers-and-electronics collection | index    | `200`                                                                                                                          |
| **Library of Congress**           | `loc.gov/…?fo=json`                     | Digital collections with a documented JSON API; includes Chronicling America (newspapers), photographs, maps, technical drawings (HAER/HABS)                                                                                                                        | api      | `200` (note: the old `chroniclingamerica.loc.gov` API paths are now `404` — the collection moved under `loc.gov/collections/`) |
| **HathiTrust**                    | `catalog.hathitrust.org/api/volumes`    | ~18M digitised volumes; the Bibliographic API is open, full text is gated by copyright, and public-domain volumes are downloadable                                                                                                                                  | api      | `200`                                                                                                                          |
| **National Archives (NARA)**      | `catalog.archives.gov/api/v2`           | The US National Archives catalogue and its digitised holdings                                                                                                                                                                                                       | api      | `200` but returned HTML for my request — the path needs checking                                                               |
| **Project Gutenberg**             | `gutendex.com/books`                    | ~70k public-domain books with a clean open API over the catalogue                                                                                                                                                                                                   | api      | `200`                                                                                                                          |
| **Biodiversity Heritage Library** | `biodiversitylibrary.org/api3`          | ~60M pages of digitised natural-history literature                                                                                                                                                                                                                  | api      | `key` (free)                                                                                                                   |
| **UK National Archives**          | `discovery.nationalarchives.gov.uk/API` | The Discovery catalogue                                                                                                                                                                                                                                             | api      | `200`                                                                                                                          |
| **Europeana**                     | `api.europeana.eu/record/v2`            | ~50M items from European cultural institutions                                                                                                                                                                                                                      | api      | `key` (free)                                                                                                                   |
| **DPLA**                          | `api.dp.la/v2`                          | Aggregates US library, archive and museum digital collections                                                                                                                                                                                                       | api      | `key` (free)                                                                                                                   |
| **Gallica (BnF)**                 | `gallica.bnf.fr/SRU`, IIIF              | French national library digitisation, with SRU, OAI and IIIF endpoints                                                                                                                                                                                              | oai      | `?` (my SRU query was malformed)                                                                                               |
| **Software Heritage**             | `archive.softwareheritage.org/api/1`    | The archive of _source code_ — every public repository, content-addressed and permanently resolvable                                                                                                                                                                | api      | `200`                                                                                                                          |
| **Wikimedia dumps**               | `dumps.wikimedia.org`                   | Full Wikipedia/Wikidata/Wikisource dumps, including the Wikisource transcriptions of government documents                                                                                                                                                           | bulk     | `200`                                                                                                                          |
| **Wikidata**                      | `query.wikidata.org/sparql`             | The structured knowledge graph — useful for reconciling identifiers (DOI ↔ ISBN ↔ OSTI ↔ patent)                                                                                                                                                                    | api      | `200`                                                                                                                          |
| **Common Crawl**                  | `index.commoncrawl.org/collinfo.json`   | Petabyte-scale web crawls with a per-crawl URL index — a last-resort recourse for pages no archive kept                                                                                                                                                             | bulk     | `200`                                                                                                                          |
| **Stack Exchange**                | `api.stackexchange.com/2.3`             | Q&A corpus; quarterly data dumps are also published                                                                                                                                                                                                                 | api/bulk | `200`                                                                                                                          |

## G. Aerospace and aviation

| Source                                       | Entry point                                   | What it holds                                                                                                                                                                 | Shape | Probed                                                 |
| -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------ |
| **NASA NTRS**                                | `ntrs.nasa.gov/api`                           | See §A — the fetch half of an existing query command                                                                                                                          | api   | `200`                                                  |
| **NASA Open Data**                           | `data.nasa.gov`, `api.nasa.gov`               | Mission datasets, imagery APIs, the technical-standards portal                                                                                                                | api   | `200`                                                  |
| **FAA DRS**                                  | `drs.faa.gov`                                 | The Dynamic Regulatory System — Airworthiness Directives, Advisory Circulars, Type Certificate Data Sheets, Orders. The engineering record behind every certificated aircraft | html  | `200`                                                  |
| **NASA ASRS**                                | `asrs.arc.nasa.gov`                           | The Aviation Safety Reporting System — the confidential incident-report database, published as periodic extracts                                                              | bulk  | `200`                                                  |
| **OpenSky Network**                          | `opensky-network.org/api`                     | Live and historical ADS-B flight tracking, with research datasets                                                                                                             | api   | `200`                                                  |
| **CelesTrak**                                | `celestrak.org/NORAD/elements/gp.php`         | Orbital element sets for every catalogued object, no account needed (unlike Space-Track)                                                                                      | api   | `200`                                                  |
| **Space-Track**                              | `space-track.org`                             | The authoritative satellite catalogue and historical TLEs — free account required                                                                                             | api   | `200` (login page)                                     |
| **EUMETSAT**                                 | `api.eumetsat.int/data`                       | European meteorological satellite data                                                                                                                                        | api   | `200`                                                  |
| **AAIB (UK)**                                | `gov.uk/…/air-accidents-investigation-branch` | UK air accident reports — the non-US counterpart to the NTSB reports already pulled                                                                                           | html  | `200`                                                  |
| **TSB Canada · ATSB Australia · BEA France** | agency sites                                  | The other major accident investigation boards; between them and the NTSB the archive would hold most of the world's published air-safety record                               | html  | `?` — the paths I guessed were wrong; the sites are up |

## H. Nuclear and energy

| Source        | Entry point             | What it holds                                                                                                                                                        | Shape    | Probed                                                           |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| **IAEA INIS** | `inis.iaea.org/search/` | The International Nuclear Information System — ~4M records on nuclear science and technology, with a large full-text set including grey literature no one else holds | html/api | `200`                                                            |
| **IAEA PRIS** | `pris.iaea.org`         | The Power Reactor Information System — design, operating history and performance for every power reactor ever built                                                  | html     | `200`                                                            |
| **OpenEI**    | `openei.org`            | DOE's open energy data platform                                                                                                                                      | api      | `200`                                                            |
| **EIA**       | `api.eia.gov/v2`        | US Energy Information Administration — generation, capacity, fuel, price series                                                                                      | api      | `key` (free)                                                     |
| **NREL**      | `developer.nrel.gov`    | Renewable resource and technology datasets                                                                                                                           | api      | `?` — did not resolve from here; likely a local DNS issue, retry |

`OSTI` (already a source) is the route to most DOE laboratory reports,
and the NTIS command's OSTI fallback already exploits that.

## I. Earth, climate and environment — datasets

These are dataset sources, not document sources: the command shape is a
periodic bulk file or a paged query, and the verification is a checksum
or a record count rather than a PDF magic number.

| Source                      | Entry point                                  | What it holds                                                                                    | Shape | Probed                          |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- | ------------------------------- |
| **NOAA NCEI**               | `ncei.noaa.gov/access/services/search/v1`    | The national climate archive — station observations, radar, satellite, palaeoclimate, bathymetry | api   | `200`                           |
| **NWS**                     | `api.weather.gov`                            | Forecasts, observations, alerts; open and key-less                                               | api   | `200`                           |
| **NDBC**                    | `ndbc.noaa.gov/data/`                        | Marine buoy observations, real-time and historical, as plain files                               | index | `200`                           |
| **USGS Earthquake Hazards** | `earthquake.usgs.gov/fdsnws/event/1`         | The ANSS Comprehensive Catalog — every recorded event with magnitude, depth and moment tensors   | api   | `200`                           |
| **USGS Water Data**         | `waterservices.usgs.gov/nwis`                | Streamflow and groundwater from ~1.9M sites                                                      | api   | `?` (transfer cut short; retry) |
| **NASA Earthdata CMR**      | `cmr.earthdata.nasa.gov/search`              | The metadata index over every NASA Earth-science collection and granule                          | api   | `200`                           |
| **Copernicus Data Space**   | `catalogue.dataspace.copernicus.eu/odata/v1` | Sentinel 1/2/3/5P imagery — an OData catalogue (note the dollar-prefixed OData parameters)       | api   | `200`                           |
| **EPA Envirofacts**         | `data.epa.gov/efservice`                     | TRI, RCRA, SDWIS, ECHO enforcement — facility-level environmental data                           | api   | `200`                           |
| **EPA AQS**                 | `aqs.epa.gov/data/api`                       | Regulatory air-quality monitoring                                                                | api   | `key` (free, by email)          |
| **OpenAQ**                  | `api.openaq.org/v3`                          | Aggregated global air-quality measurements                                                       | api   | `key` (free)                    |
| **GBIF**                    | `api.gbif.org/v1`                            | ~3B species occurrence records                                                                   | api   | `200`                           |

## J. Geospatial — datasets

| Source                     | Entry point                        | What it holds                                                                                                                            | Shape    | Probed |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| **USGS National Map**      | `tnmaccess.nationalmap.gov/api/v1` | Elevation (3DEP), hydrography, transportation, and the **historical topographic map collection** — every USGS quad ever printed, scanned | api      | `200`  |
| **Census TIGER/Line**      | `census.gov/geographies`           | Every US administrative and statistical boundary, annually                                                                               | bulk     | `—`    |
| **OpenStreetMap Overpass** | `overpass-api.de/api`              | Queryable OSM extract; Geofabrik publishes regional bulk files                                                                           | api/bulk | `200`  |
| **Natural Earth**          | `naturalearthdata.com/downloads/`  | Public-domain world base-map vectors at three scales                                                                                     | bulk     | `200`  |
| **GeoNames**               | `api.geonames.org`                 | ~12M place names with coordinates and hierarchy; full dumps published                                                                    | api/bulk | `200`  |

## K. Astronomy, physics and space — datasets

| Source                  | Entry point                                                     | What it holds                                                                                                  | Shape | Probed                                |
| ----------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------- |
| **HEASARC**             | `heasarc.gsfc.nasa.gov/xamin/vo/tap`                            | High-energy astrophysics archive with a TAP (ADQL) interface — every X-ray and gamma-ray mission               | api   | `200` (the table list alone is 10 MB) |
| **VizieR / SIMBAD**     | `vizier.cds.unistra.fr`, `simbad.cds.unistra.fr/simbad/sim-tap` | The CDS Strasbourg catalogues — ~25k published astronomical catalogues, and the object database, both with TAP | api   | `200`                                 |
| **MAST**                | `mast.stsci.edu/api/v0`                                         | Hubble, JWST, TESS, Kepler archives                                                                            | api   | `?` (my call lacked parameters)       |
| **JPL SBDB / Horizons** | `ssd-api.jpl.nasa.gov`, `ssd.jpl.nasa.gov/api`                  | Small-body orbital elements and physical parameters; Horizons ephemerides for any solar-system body            | api   | `200`                                 |

## L. Chemistry, materials and life sciences — datasets

| Source                            | Entry point                         | What it holds                                                                                                                                      | Shape | Probed       |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| **PubChem**                       | `pubchem.ncbi.nlm.nih.gov/rest/pug` | ~120M compounds with properties, spectra, safety data                                                                                              | api   | `200`        |
| **NIST Chemistry WebBook**        | `webbook.nist.gov`                  | Thermochemical, thermophysical and spectroscopic reference data — the standard reference. Complements the NIST publication series already wired up | html  | `200`        |
| **RCSB PDB**                      | `data.rcsb.org/rest/v1`             | ~220k experimentally determined macromolecular structures                                                                                          | api   | `200`        |
| **Crystallography Open Database** | `crystallography.net/cod`           | ~500k crystal structures, open                                                                                                                     | api   | `200`        |
| **Materials Project**             | `api.materialsproject.org`          | Computed properties for ~150k inorganic materials                                                                                                  | api   | `key` (free) |
| **openFDA**                       | `api.fda.gov`                       | Device adverse events and recalls, drug labels — the device side is engineering failure data                                                       | api   | `200`        |
| **ClinicalTrials.gov**            | `clinicaltrials.gov/api/v2`         | Every registered trial with protocol and results                                                                                                   | api   | `200`        |

## M. Economic, statistical and general government data

| Source             | Entry point                                        | What it holds                                                                                                                                                              | Shape    | Probed                                                              |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| **SEC EDGAR**      | `data.sec.gov`, `efts.sec.gov/LATEST/search-index` | Every public-company filing since 1993, with a full-text search API and structured financial data. Useful for the semiconductor and defense-contractor side of the archive | api/bulk | `200`                                                               |
| **USAspending**    | `api.usaspending.gov/api/v2`                       | Every federal contract, grant and award — including defense procurement line items                                                                                         | api      | `200`                                                               |
| **Census Bureau**  | `api.census.gov`                                   | Decennial census, ACS, economic census, County Business Patterns                                                                                                           | api      | `200`                                                               |
| **BLS**            | `api.bls.gov/publicAPI/v2`                         | Employment, CPI, PPI, productivity series                                                                                                                                  | api      | `200` (higher limits with a free key)                               |
| **World Bank**     | `api.worldbank.org/v2`                             | ~16k development indicators for every country                                                                                                                              | api      | `200`                                                               |
| **Eurostat**       | `ec.europa.eu/eurostat/api/dissemination`          | European statistics, SDMX and JSON                                                                                                                                         | api      | `200`                                                               |
| **UN SDG**         | `unstats.un.org/SDGAPI/v1`                         | The Sustainable Development Goal indicator series                                                                                                                          | api      | `200`                                                               |
| **data.europa.eu** | `data.europa.eu/api/hub/search`                    | The EU open data portal — a catalogue over member-state portals                                                                                                            | api      | `200`                                                               |
| **BEA**            | `apps.bea.gov/api`                                 | National accounts, GDP by industry, international transactions                                                                                                             | api      | `key` (free)                                                        |
| **FRED**           | `api.stlouisfed.org/fred`                          | ~800k economic time series                                                                                                                                                 | api      | `key` (free)                                                        |
| **IMF**            | `imf.org/external/datamapper/api/v1`               | World Economic Outlook and other series                                                                                                                                    | api      | `403` to this request                                               |
| **data.gov**       | `catalog.data.gov/api/3`                           | The CKAN catalogue over every federal dataset — a discovery layer rather than a source                                                                                     | api      | `?` — the CKAN action path I tried returned `404`; the portal is up |

## N. Transportation safety beyond the NTSB

The NTSB commands already cover US aviation, rail, marine, highway and
pipeline _investigations_. These are the regulators' own data.

| Source                   | Entry point                         | What it holds                                                                 | Shape     | Probed |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------- | --------- | ------ |
| **NHTSA**                | `api.nhtsa.gov`                     | Recalls, complaints, investigations, NCAP crash-test results, VIN decoding    | api       | `200`  |
| **FRA Office of Safety** | `safetydata.fra.dot.gov`            | Every reported rail accident, incident and inspection since 1975              | html/bulk | `200`  |
| **BTS TranStats**        | `transtats.bts.gov`                 | On-time performance, airline schedules, freight flows, the T-100 segment data | bulk      | `200`  |
| **PHMSA**                | `phmsa.dot.gov/data-and-statistics` | Pipeline incidents and hazardous-materials incidents                          | bulk      | `403`  |

## O. Legal and regulatory

| Source                    | Entry point                     | What it holds                                                                                                                                             | Shape | Probed |
| ------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| **CourtListener / RECAP** | `courtlistener.com/api/rest/v4` | Federal and state opinions, PACER dockets, oral arguments. Patent and product-liability litigation is often the only public source for engineering detail | api   | `200`  |
| **EUR-Lex**               | `eur-lex.europa.eu`             | EU law, with a documented web service and SPARQL endpoint                                                                                                 | api   | `200`  |

---

## Keyed lookups — candidates for `bulk query`

These resolve an identifier to a record, which is the
[query](guide/querying.md) shape rather than the fetch shape. Several
are one small `QueryService` each.

| Plugin                | Service                      | Key                                                                                                     |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `bulk openalex query` | OpenAlex                     | A DOI, title or author — and it returns open-access PDF locations, which `bulk crossref query` does not |
| `bulk pubmed query`   | NCBI E-utilities             | PMID, PMCID or DOI                                                                                      |
| `bulk ads query`      | NASA ADS                     | Bibcode                                                                                                 |
| `bulk dtic query`     | DTIC                         | An `AD…` accession number — would also complete the NTIS fallback                                       |
| `bulk patent query`   | USPTO / EPO                  | A patent number                                                                                         |
| `bulk oclc query`     | HathiTrust Bibliographic API | OCLC number, LCCN or ISBN — a second opinion alongside Open Library                                     |
| `bulk swh query`      | Software Heritage            | A repository URL → its archived, content-addressed snapshot                                             |
| `bulk wikidata query` | Wikidata                     | Any identifier → every other identifier for the same work                                               |

## Needs a free key

Worth knowing before any of these is scheduled: GovInfo, Congress.gov,
Regulations.gov (all on `api.data.gov` — one key covers them), CORE, NASA
ADS, BHL, Europeana, DPLA, EIA, BEA, FRED, EPA AQS, OpenAQ, Materials
Project, EPO OPS. Registration is free in every case; the archive has no
place to keep a secret yet, so that is a small design question to settle
first — an environment variable read by `lib/` would match how
`BULK_ARCHIVE` and `BULK_CACHE` already work.

## Recommended first five

If this list gets acted on, these are the ones that give the most for the
least work and fit the archive's existing weight:

1. **Bitsavers** — the best single match for the computers-and-electronics
   collection, and a plain directory tree, so the command is small.
2. **3GPP and ETSI** — both are numbered directory trees of free PDFs, the
   same shape as `bulk ietf-rfc fetch`, and they extend the
   telecommunications standards work the ITU commands started.
3. **NASA NTRS fetch** — the query half already exists and is tested; the
   fetch half is a short module against an API known to work.
4. **DTIC** — completes the NTIS command's `AD…` route, which is
   currently implemented but unverified, and is a major source in itself.
5. **Army Publishing Directorate** — the authoritative source for the
   doctrine and TOE work already in the repo.

## Promoting a candidate

The order the [standards](standards.md) set, and the existing
sources follow:

1. Probe the host properly — every entry point, the catalogue request,
   the file endpoint's failure modes, `robots.txt`, and what the archive
   already holds. Record it in `docs/sources/<plugin>/access.md`
   with the requests made and their answers, including the failures.
2. Add the row to the [host table](guide/fetching.md#host-access-findings),
   whether the answer was open or closed. A `403` recorded honestly is
   worth as much as a success — the NOAA and NRC rows were overturned
   only because the earlier failure had been written down precisely
   enough to re-test.
3. Then write the plugin, as [writing a plugin](guide/writing-a-plugin.md) describes.

The NTIS entry is the worked example of what step 1 is for: the
catalogue turned out to be open and the download turned out to be broken
for everyone, and only a real probe — in a browser as well as from curl —
could tell those apart.
