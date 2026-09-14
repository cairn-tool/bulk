# USDA National Agricultural Library catalogue — access research

What was established, by making the requests rather than reading about them, before the `usda-nal` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made. The Treesearch half of the same note is on [usda-treesearch](../usda-treesearch/access.md).

Probed 2026-09-14. Everything below was run; nothing is inferred from
documentation alone.

## What the USDA publishes, and where

The department's documents are not in one place. Four candidate entry
points were tried; two are open and useful, and they serve different
halves of the job.

| Host                                       | What it serves                                                                   | Answer                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `research.fs.usda.gov`                     | Forest Service Research — Treesearch, the full-text publication collection       | **Open**, no API but three plain GETs are enough                                       |
| `search.nal.usda.gov`                      | The National Agricultural Library catalogue (AGRICOLA, PubAg) on Ex Libris Primo | **Open** through Primo's own public endpoint, key-less                                 |
| `na91.alma.exlibrisgroup.com`              | The Alma back end behind the above                                               | Times out from here; the OAI endpoint is `403 Unauthorized access to the OAI services` |
| `naldc.nal.usda.gov`, `pubag.nal.usda.gov` | The old NAL Digital Collections and PubAg sites                                  | Both now redirect into `search.nal.usda.gov`                                           |

So: **Treesearch is the fetch source** (documents), and **NAL Primo is
the query source** (records). That split is why
`bulk usda-treesearch fetch` and `bulk usda-nal query` go to different hosts.

## NAL Primo — the query source

`naldc.nal.usda.gov` and `pubag.nal.usda.gov` both now redirect to
`search.nal.usda.gov/discovery/…`, the library's Ex Libris Primo VE view.
Primo's own public REST endpoint — the one the web interface calls —
needs no key:

```text
GET https://search.nal.usda.gov/primaws/rest/pub/configuration/vid/01NAL_INST:MAIN
  -> 200 application/json, 156,635 bytes

GET https://search.nal.usda.gov/primaws/rest/pub/pnxs
      ?q=any,contains,soybean%20rust&scope=MyInstitution&vid=01NAL_INST:MAIN&limit=5&…
  -> 200 application/json
     info: {"totalResultsLocal": 875, "total": 875, "first": 1, "last": 5}
     docs: 5 PNX documents
```

The configuration names three scopes for this view:

| Scope           | Collection                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| `MyInstitution` | Everything the library holds                                                     |
| `agricola`      | AGRICOLA — the NAL bibliographic database, US agricultural literature since 1862 |
| `pubag`         | PubAg — USDA-authored journal articles                                           |

A PNX document splits into `display` (catalogue fields) and `addata`
(citation fields: ISBN, ISSN, DOI, journal, pages). Display values carry
sub-fields after `$$`; `$$Q` is the normalised heading, and for a _name_
that is the clean form — the plain value trails the author's whole
affiliation and e-mail address:

```json
"creator": ["Delaney, Mary author Department of Entomology and Plant Pathology,
             Auburn University, Auburn, AL 36849, USA. <contact>$$QDelaney, Mary"]
```

so the command takes `$$Q` for names and the plain value for series,
where the plain value is the fuller one.

### What it does not give

Records, not files. A PubAg article carries the publisher's DOI
(`10.3390/su10061784`) and a catalogue record carries ISBNs and an OCLC
number, but neither carries a PDF the library will serve. Alma-D
delivery was tried — `/primaws/rest/pub/collectionDiscovery/…` 404s at
every path tried, and the Alma OAI endpoint answers
`error_code 21, Unauthorized access to the OAI services` — so there is no
bulk route to the digitised NAL collections from here. That is why the
USDA fetch command goes to Treesearch and the USDA query command goes to
Primo.

Verified lookups on 2026-09-14: `any,contains,soybean rust` → 875
matches, best _Soybean rust_, Bromfield, 1984; the same text in the
`pubag` scope with `title` → 22 matches, best the 2018 _Sustainability_
meta-analysis with its DOI; `isbn,contains,9780890540626` → 1 match, the
Bromfield monograph.

## Requests made

| When       | Request                                                                        | Answer                                                                    |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 2026-09-14 | `GET naldc.nal.usda.gov/`                                                      | 200 after redirect to `search.nal.usda.gov/discovery/collectionDiscovery` |
| 2026-09-14 | `GET pubag.nal.usda.gov/`                                                      | 200 after redirect to `…/discovery/search?…search_scope=pubag`            |
| 2026-09-14 | `GET search.nal.usda.gov/primaws/rest/pub/configuration/vid/01NAL_INST:MAIN`   | 200 application/json                                                      |
| 2026-09-14 | `GET …/primaws/rest/pub/pnxs?q=any,contains,soybean rust&scope=MyInstitution`  | 200, 875 results                                                          |
| 2026-09-14 | `GET …/primaws/rest/pub/pnxs?…&scope=pubag`                                    | 200, 579 results                                                          |
| 2026-09-14 | `GET …/primaws/rest/pub/collectionDiscovery/{topLevelCollections,collections}` | 404                                                                       |
| 2026-09-14 | `GET search.nal.usda.gov/view/oai/01NAL_INST/request?verb=Identify`            | 403, error_code 21                                                        |
| 2026-09-14 | `GET na91.alma.exlibrisgroup.com/view/oai/01NAL_INST/request?verb=Identify`    | Connection timed out (30 s)                                               |
| 2026-09-14 | `GET research.fs.usda.gov/treesearch`                                          | 200 text/html                                                             |
| 2026-09-14 | `GET research.fs.usda.gov/treesearch?text=wildfire`                            | 200, 10 links, "3,913 Publications", pager to page 391                    |
| 2026-09-14 | `GET …?text=wildfire&items_per_page={50,100}`                                  | 200, still 10 links — the page size is fixed                              |
| 2026-09-14 | `GET research.fs.usda.gov/sitemap.xml`                                         | 200, 15-page index                                                        |
| 2026-09-14 | `GET research.fs.usda.gov/sitemap.xml?page=3`                                  | 200, 5,000 `/treesearch/<id>` entries                                     |
| 2026-09-14 | `GET research.fs.usda.gov/treesearch/67890`                                    | 200, field table + `citation_*` meta tags                                 |
| 2026-09-14 | `GET research.fs.usda.gov/jsonapi`                                             | 404 — no Drupal JSON:API                                                  |
| 2026-09-14 | `GET www.fs.usda.gov/rm/pubs/rmrs_gtr042_1.pdf`                                | 200 application/pdf, 1,428,922                                            |
| 2026-09-14 | `GET research.fs.usda.gov/download/treesearch/<id>.pdf` ×3                     | 200 application/pdf, all `%PDF-`                                          |
