# Complete command listing

`bulk` is one plugin per data source, and each plugin has up to three sub-commands — `fetch`
(pull a catalogue into the archive), `list` (enumerate it without downloading) and `query`
(identifiers in, records out). Around them sit the cache, configuration and contract commands.
Angle brackets in usage signatures are required arguments; square brackets are optional.

Every plugin command accepts the [common options](commands/common.md) — `--format`, `--envelope`,
`--quiet`, and the shared fetch, list and query options. For what each source publishes see
[Data sources](sources.md); for why the fetch pipeline behaves as it does see the
[guides](guide.md).

## Global interface

| Command                                             | Description                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bulk --help`                                       | Show top-level help.                                                                  |
| `bulk --version`                                    | Print the installed version.                                                          |
| [`bulk --docs`](commands/common.md#docs)            | Print the shared usage documentation: common behaviour, configuration and the guides. |
| [`bulk <plugin> --docs`](commands/common.md#docs)   | Print a source's documentation: overview, access research and every command page.     |
| [`bulk sources`](commands/sources.md)               | List every plugin, its commands, and the hosts it talks to.                           |
| [`bulk check-update`](commands/check-update.md)     | Query the configured npm registry for the latest published version.                   |
| [`bulk describe`](commands/describe.md)             | Describe the CLI contract: commands, options, exit codes, and schemas.                |
| [`bulk schema`](commands/schema.md)                 | Print a published output schema, or list the available schemas.                       |
| [`bulk completion <shell>`](commands/completion.md) | Print a shell completion script for bash, zsh, fish, or powershell.                   |

## Plugin commands

| Plugin                                                         | Commands                                                                                                                                                                     | Source                                                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`archive-items`](sources/archive-items/overview.md)           | [`archive-items fetch`](commands/archive-items/fetch.md) · [`archive-items list`](commands/archive-items/list.md) · [`archive-items query`](commands/archive-items/query.md) | Internet Archive items — files of the items matching a query, collection or identifier, sha1-verified; item records by identifier     |
| [`archive-wayback`](sources/archive-wayback/overview.md)       | [`archive-wayback fetch`](commands/archive-wayback/fetch.md) · [`archive-wayback list`](commands/archive-wayback/list.md)                                                    | Wayback Machine — snapshots of URLs on hosts that block scripts; the recourse for a Cloudflare-gated publisher                        |
| [`arxiv`](sources/arxiv/overview.md)                           | [`arxiv fetch`](commands/arxiv/fetch.md) · [`arxiv list`](commands/arxiv/list.md)                                                                                            | arXiv e-prints — papers by search, category or identifier; PDFs (or the submitted source), versioned                                  |
| [`cern-cds`](sources/cern-cds/overview.md)                     | [`cern-cds fetch`](commands/cern-cds/fetch.md) · [`cern-cds list`](commands/cern-cds/list.md)                                                                                | CERN Document Server — records by OAI-PMH set, Invenio query or id; the Anubis gate is solved so files come from CDS                  |
| [`cern-yellowreports`](sources/cern-yellowreports/overview.md) | [`cern-yellowreports fetch`](commands/cern-yellowreports/fetch.md) · [`cern-yellowreports list`](commands/cern-yellowreports/list.md)                                        | CERN Yellow Reports (e-publishing.cern.ch) — the CERN-yyyy-nnn series as article PDFs; open, no challenge                             |
| [`crossref`](sources/crossref/overview.md)                     | [`crossref query`](commands/crossref/query.md)                                                                                                                               | Crossref — the record for a DOI (title, authors, journal, date, publisher, licence, full-text links)                                  |
| [`ietf-rfc`](sources/ietf-rfc/overview.md)                     | [`ietf-rfc fetch`](commands/ietf-rfc/fetch.md) · [`ietf-rfc list`](commands/ietf-rfc/list.md)                                                                                | RFCs from the RFC Editor by number range or missing-from a folder; PDF with text fallbacks                                            |
| [`itu-r`](sources/itu-r/overview.md)                           | [`itu-r fetch`](commands/itu-r/fetch.md) · [`itu-r list`](commands/itu-r/list.md)                                                                                            | ITU-R Recommendations by series, crawled from the series pages; every edition, plain files                                            |
| [`itu-t`](sources/itu-t/overview.md)                           | [`itu-t fetch`](commands/itu-t/fetch.md) · [`itu-t list`](commands/itu-t/list.md)                                                                                            | ITU-T Recommendations by series and approval date via the MyWorkspace API; login-free download of the public texts                    |
| [`nist-techpubs`](sources/nist-techpubs/overview.md)           | [`nist-techpubs fetch`](commands/nist-techpubs/fetch.md) · [`nist-techpubs list`](commands/nist-techpubs/list.md) · [`nist-techpubs query`](commands/nist-techpubs/query.md) | NIST/NBS Technical Series — SP, FIPS, NISTIR, TN, Circulars, Handbooks and the rest, by series, date or title; records by designation |
| [`noaa-ir`](sources/noaa-ir/overview.md)                       | [`noaa-ir fetch`](commands/noaa-ir/fetch.md) · [`noaa-ir list`](commands/noaa-ir/list.md)                                                                                    | NOAA Institutional Repository — journal articles, technical memoranda and reports, by collection (JSON API, sha256-verified)          |
| [`nrc-adams`](sources/nrc-adams/overview.md)                   | [`nrc-adams fetch`](commands/nrc-adams/fetch.md) · [`nrc-adams list`](commands/nrc-adams/list.md)                                                                            | NRC ADAMS public library — documents by accession number, docket, type, date range or free text (APS search API)                      |
| [`ntis-ntrl`](sources/ntis-ntrl/overview.md)                   | [`ntis-ntrl fetch`](commands/ntis-ntrl/fetch.md) · [`ntis-ntrl list`](commands/ntis-ntrl/list.md) · [`ntis-ntrl query`](commands/ntis-ntrl/query.md)                         | NTIS National Technical Reports Library — records by search or accession number, with the full text taken from the issuing agency     |
| [`ntrs`](sources/ntrs/overview.md)                             | [`ntrs query`](commands/ntrs/query.md)                                                                                                                                       | NASA Technical Reports Server — citation by accession number, or best match for a title                                               |
| [`ntsb-avdata`](sources/ntsb-avdata/overview.md)               | [`ntsb-avdata fetch`](commands/ntsb-avdata/fetch.md) · [`ntsb-avdata list`](commands/ntsb-avdata/list.md)                                                                    | NTSB aviation database dumps — avall.zip (monthly, 96 MB), Pre2008 / PRE1982, the monthly deltas and schema PDFs                      |
| [`ntsb-carol`](sources/ntsb-carol/overview.md)                 | [`ntsb-carol fetch`](commands/ntsb-carol/fetch.md) · [`ntsb-carol list`](commands/ntsb-carol/list.md)                                                                        | NTSB CAROL case database — every case record (findings, narratives, probable cause) exported year by year, JSON and CSV               |
| [`ntsb-dockets`](sources/ntsb-dockets/overview.md)             | [`ntsb-dockets fetch`](commands/ntsb-dockets/fetch.md) · [`ntsb-dockets list`](commands/ntsb-dockets/list.md)                                                                | NTSB accident dockets — every factual report, exhibit, photo and data file of an investigation; 27,000 dockets                        |
| [`ntsb-reports`](sources/ntsb-reports/overview.md)             | [`ntsb-reports fetch`](commands/ntsb-reports/fetch.md) · [`ntsb-reports list`](commands/ntsb-reports/list.md)                                                                | NTSB investigation reports — every adopted report and brief, ~2,000 PDFs, 4.5 GB, filed by mode                                       |
| [`openlibrary`](sources/openlibrary/overview.md)               | [`openlibrary query`](commands/openlibrary/query.md)                                                                                                                         | Open Library records by ISBN — title, authors, date, publisher                                                                        |
| [`osti`](sources/osti/overview.md)                             | [`osti fetch`](commands/osti/fetch.md) · [`osti list`](commands/osti/list.md) · [`osti query`](commands/osti/query.md)                                                       | OSTI.GOV — DOE technical reports, journal articles and conference papers with full text, and records by report designation            |
| [`usda-nal`](sources/usda-nal/overview.md)                     | [`usda-nal query`](commands/usda-nal/query.md)                                                                                                                               | USDA National Agricultural Library — AGRICOLA and PubAg records by title, author or identifier                                        |
| [`usda-treesearch`](sources/usda-treesearch/overview.md)       | [`usda-treesearch fetch`](commands/usda-treesearch/fetch.md) · [`usda-treesearch list`](commands/usda-treesearch/list.md)                                                    | Forest Service Treesearch — GTRs, Research Papers, station publications and FS-authored articles, by search or id                     |

## Cache commands

| Command                                         | Description                                              |
| ----------------------------------------------- | -------------------------------------------------------- |
| [`bulk cache list`](commands/cache/list.md)     | Every cached bot-challenge cookie, with its state.       |
| [`bulk cache clear`](commands/cache/clear.md)   | Remove cached cookies: all, one solver's, or one host's. |
| [`bulk cache path`](commands/cache/path.md)     | Print the cache directory.                               |
| [`bulk cache limits`](commands/cache/limits.md) | The per-host rate limits in force.                       |

## Configuration commands

| Command                                       | Description                                                     |
| --------------------------------------------- | --------------------------------------------------------------- |
| [`bulk config path`](commands/config/path.md) | Print the configuration file path.                              |
| [`bulk config show`](commands/config/show.md) | Print the resolved configuration, defaults included.            |
| [`bulk config init`](commands/config/init.md) | Write a starter configuration file, never over an existing one. |

## Exit codes

| Code  | Meaning                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------- |
| `0`   | Success — every selected item present and verified, or at least one key found.                 |
| `1`   | Invocation, I/O, network, or configuration error; a fetch that failed before pulling anything. |
| `2`   | Actionable findings — one or more items failed, no key was found, or an update is available.   |
| `130` | Interrupted with Ctrl-C; a fetch can be resumed by re-running the same command.                |

The full rules are in the [result contract](contract.md).
