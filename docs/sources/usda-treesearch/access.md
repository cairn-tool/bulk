# USDA Forest Service Treesearch — access research

What was established, by making the requests rather than reading about them, before the `usda-treesearch` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made. The NAL Primo half of the same note is on [usda-nal](../usda-nal/access.md).

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

## Treesearch — the fetch source

A Drupal site with no API, but everything needed is a plain GET.

### The search view

```text
GET https://research.fs.usda.gov/treesearch?text=wildfire
  -> 200 text/html, 184,175 bytes
     10 result links  href="/treesearch/<id>"
     "3,913 Publications" in the page
     pager  ?text=wildfire&page=0 … &page=391
```

The exposed filters are `text` (the search box) and `is_full_pub`
(`1` = full publications only, `All` = everything). The page size is
**fixed at 10** — `items_per_page=50` and `=100` were both tried and both
returned 10 links — so a large harvest is a lot of pages, which is why
`--all` uses the sitemap instead.

### The sitemap

```text
GET https://research.fs.usda.gov/sitemap.xml
  -> 200, a Simple XML Sitemap index of 15 pages
GET https://research.fs.usda.gov/sitemap.xml?page=3
  -> 200, 736,549 bytes, 5,000 <loc> entries, every one /treesearch/<id>
```

Fifteen pages of up to 5,000 entries is a complete enumeration of the
collection in fifteen requests.

### One publication

```text
GET https://research.fs.usda.gov/treesearch/67890   -> 200 text/html
```

The fields are a table with a stable class on each cell:

```html
<td class="fsrd-field-table__cell fsrd-field-table__cell--label">Authors:</td>
<td class="fsrd-field-table__cell fsrd-field-table__cell--item">
  Northern Research Station USDA Forest Service
</td>
```

giving **Authors, Year, Type, Station, Source**. The page also carries
Google Scholar citation meta tags, which is the more stable of the two:

```html
<meta name="citation_title" content="Understanding Old-Growth Forest Carbon Storage Potential…" />
<meta name="citation_author" content="Northern Research Station USDA Forest Service" />
<meta name="citation_publication_date" content="2024" />
<meta
  name="citation_pdf_url"
  content="https://research.fs.usda.gov/download/treesearch/67890.pdf"
/>
```

The command reads both and prefers whichever is present.

**Station** is the natural folder level — Northern, Rocky Mountain,
Southern, Pacific Northwest, Pacific Southwest, International Institute
of Tropical Forestry, Forest Products Laboratory — and that is what the
command files by.

### The document

```text
GET https://research.fs.usda.gov/download/treesearch/67890.pdf
  -> a plain PDF; the page states its size as "Download (PDF 6.88 MB)"
```

Older Forest Service PDFs also sit directly on `www.fs.usda.gov`
(`/rm/pubs/rmrs_gtr042_1.pdf` → 200 application/pdf, 1,428,922 bytes),
but the `download/treesearch/<id>.pdf` route is uniform and is what the
command uses.

Verified downloads on 2026-09-14: three 2026 fire-behaviour papers,
4.7 MB, 4.0 MB and 2.4 MB, all `%PDF-`; a re-run skipped all three.

No `robots.txt` obstacle was encountered and no challenge, cookie or
token is involved. A browser User-Agent is accepted.

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
