# NTIS National Technical Reports Library — access research

What was established, by making the requests rather than reading about them, before the `ntis-ntrl` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

Probed 2026-09-14. Everything below was run, and the one negative result
that matters was confirmed in a real browser as well as from curl.

## What NTIS is

The National Technical Information Service acquires, indexes, abstracts
and archives US government-sponsored technical reports — the largest such
collection there is. Its public catalogue is the **National Technical
Reports Library** at `ntrl.ntis.gov`, which describes itself as offering
"online, free and open access to these authenticated government technical
reports."

| Host                            | What it serves                                   | Answer                                      |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `ntrl.ntis.gov`                 | The NTRL catalogue — search and per-record pages | **Open**; the records come out cleanly      |
| `ntrl.ntis.gov` download action | The documents                                    | **Broken** — an empty 200, in a browser too |
| `www.osti.gov`                  | The DOE-origin documents NTIS indexes            | Open, and tolerant of NTIS's spelling       |
| `apps.dtic.mil`                 | The `AD…` documents NTIS indexes                 | Under scheduled maintenance on 2026-09-14   |

## The catalogue works

NTRL is a JSF / PrimeFaces 6 application on Payara, behind Cloudflare and
an AWS load balancer. It is stateful — a `JSESSIONID` and a
`javax.faces.ViewState` both have to be carried — but only three request
shapes are needed.

### Search, page 1 — a plain GET

```text
GET https://ntrl.ntis.gov/NTRL/dashboard/searchResults.xhtml?searchQuery=radar
  -> 200 text/html, 168,347 bytes
```

The results are rendered **server-side**, so page 1 needs no POST. Each
row carries its accession number in `data-rk`:

```html
<tr data-ri="0" data-rk="N7113901" …>
  <td>
    <span id="…:0:itemTitleSR">Advanced Radar Systems.</span>
    <span id="…:0:itempersonalAuthorsAsTextSR">Voles, R.</span>
  </td>
  <td><span class="searchResultsAbbr">N7113901</span></td>
  <td><span class="searchResultsSummaryDetails">1970</span></td>
  <td><span class="searchResultsSummaryDetails">523 pages</span></td>
  …
</tr>
```

and the paginator prints the total: `(1 - 25 of 9282)`.

### Search, page 2 and after — the DataTable pagination POST

```text
POST https://ntrl.ntis.gov/NTRL/dashboard/searchResults.xhtml;jsessionid=…?searchQuery=…
  javax.faces.partial.ajax=true
  javax.faces.source=searchResultsForm:searchResultsTable
  searchResultsForm:searchResultsTable_pagination=true
  searchResultsForm:searchResultsTable_first=100
  searchResultsForm:searchResultsTable_rows=100
  searchResultsForm:searchResultsTable_rppDD=100
  javax.faces.ViewState=<from the previous response>
  -> 200 text/xml, a partial-response carrying the rows in the same markup
```

**100 rows a page is accepted** — tried and returned 100 — so a 9,282-hit
search is 93 requests, not 372. The partial-response carries a fresh
ViewState, which the client re-reads each time.

### One record — a stateless GET

```text
GET https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/ADA130537.xhtml
  -> 200 text/html, 33,004 bytes
```

No session needed. The record is a two-column table with a stable id
pattern:

```html
<td><span id="detailsForm:publicationDateLabel">Publication Date</span></td>
<td><span id="detailsForm:publicationDate">1981</span></td>
```

Multi-valued fields are PrimeFaces DataLists
(`class="ui-datalist-item"`). Note the label id and the value id are not
always the same stem — `sourceAgencyLabel` pairs with `sourceAgencies` —
so the parser walks the table rows rather than guessing the value's id.

Fields seen: Publication Date, Personal Author, Page Count, Abstract,
Keywords, Source Agency, NTIS Subject Category, Corporate Authors,
Supplemental Notes, Document Type, NTIS Issue Number.

## The download does not work

The search-results list shows a "Download PDF" and a "Download Full Text"
command link on **every** row, whether or not the document exists. The
**title-detail page is the authority**: its Actions toolbar holds a
Download link only for records that have one.

```text
ADA130537      actions: Item Details                              — no download
N7113901       actions: Item Details                              — no download
PB2019100001   actions: Download PDF, Item Details
PB2021100329   actions: Download PDF, Download XML, Item Details
```

For a record that _does_ offer it, replaying the command link returns
nothing:

```text
POST …/titleDetail/PB2021100329.xhtml;jsessionid=…
  detailsTBarForm=detailsTBarForm
  detailsTBarForm:j_idt33=detailsTBarForm:j_idt33      (the Download PDF link)
  javax.faces.ViewState=…
  -> 200, content-length: 0, no Content-Type, no Content-Disposition
```

**This was confirmed in Chrome.** Clicking the link in a real browser
navigates and returns a 0-byte 200; reproducing the form POST with
`fetch()` from the page's own origin, with the page's own cookies and
ViewState, returns `{status: 200, bytes: 0, ctype: "application/xhtml+xml",
disp: null}` for both `j_idt33` and `j_idt35`, on the search page and on
the detail page alike. It is the site that is broken, not the scripting
of it.

Without the session cookies the same POST answers **500**, which is worth
knowing so a future 500 is not mistaken for the same fault.

## What does work: the issuing agency

An NTIS accession number usually names the agency that issued the report,
and NTIS writes report numbers with the punctuation stripped. **OSTI's
`identifier` search tolerates exactly that:**

```text
GET www.osti.gov/api/v1/records?identifier=ORNLTM3177
  -> 1 hit: ORNL-TM-3177, "MOLTEN SALT BREEDER EXPERIMENT DESIGN BASES."
     fulltext https://www.osti.gov/servlets/purl/4104902
GET …?identifier=CONF7510651   -> 1 hit: CONF-751065--1
GET …?identifier=ORNL5011      -> 2 hits (ambiguous; the first is taken)
GET …?identifier=DE85750031    -> 0 hits (a DE number is NTIS's, not OSTI's)
```

A search for "molten salt reactor" shows how common that shape is — of
the first 15 accession numbers, 13 were report numbers
(`ORNLTR2508`, `ORNLTM3177`, `ORNL5011`, `CONF7510651`, `ANL679255370`,
`BARC690PP5460`, `EIR249`, `CF61562` …) and only two were `DE…` numbers.

`AD…` accessions are DTIC's, at `apps.dtic.mil/sti/pdfs/<accession>.pdf`.
That route is **not verified**: on 2026-09-14 every path on
`apps.dtic.mil` redirected to `/landingpage/maint.html` — "Our Site is
Getting an Upgrade… scheduled maintenance" — so the host was down for
everyone. The command implements the documented URL shape and reports the
maintenance page honestly as "an HTML page instead of the file", which is
what it did when tested.

Everything else — `PB…`, `N…` (NASA STAR), `JPRS…`, foreign-exchange
reports — has no mechanical route. Those are reported with their
accession numbers so `bulk ntrs query --search "<title>"` or
`bulk archive-wayback fetch` can be pointed at them.

## Verified end to end

| When       | What                                       | Result                                                                           |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| 2026-09-14 | `--accession ORNLTM3177`                   | Resolved to OSTI 4104902, downloaded 2,637,193 bytes, `%PDF-`                    |
| 2026-09-14 | `--accession ADA130537`                    | Resolved to DTIC, failed cleanly: "an HTML page instead of the file (672 bytes)" |
| 2026-09-14 | `--accession ORNL5011`                     | No source; reported with its accession number                                    |
| 2026-09-14 | `--accession PB2021100329 --source ntrl`   | `FAIL empty body ()` — the verified NTRL fault, reproduced through the command   |
| 2026-09-14 | `--query "fluoride volatility" --limit 30` | 15,058 hits; 30 records read across the page boundary                            |

## Requests made

| When       | Request                                                                             | Answer                                                            |
| ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 2026-09-14 | `GET ntrl.ntis.gov/NTRL/`                                                           | 200 text/html                                                     |
| 2026-09-14 | `GET ntrl.ntis.gov/api/`                                                            | 404 — there is no REST API                                        |
| 2026-09-14 | `GET …/searchResults.xhtml?searchQuery=radar`                                       | 200, 25 rows rendered server-side, total 9,282-style paginator    |
| 2026-09-14 | `POST …` DataTable pagination, rows=25 then rows=100                                | 200 text/xml, 25 then 100 rows                                    |
| 2026-09-14 | `GET …/titleDetail/{ADA130537,N7113901,PB2019100001,PB2021100329,DE85750031}.xhtml` | 200 each, full records                                            |
| 2026-09-14 | `POST` the Download PDF command link, curl, with session                            | 200, content-length 0                                             |
| 2026-09-14 | `POST` the same, curl, without session                                              | 500                                                               |
| 2026-09-14 | The same through Chrome — click, and `fetch()` from the page's origin               | 200, 0 bytes, both links, both pages                              |
| 2026-09-14 | `GET apps.dtic.mil/sti/pdfs/ADA130537.pdf` (and three other DTIC paths)             | 200 text/html at `/landingpage/maint.html`, 1,408 bytes           |
| 2026-09-14 | `GET www.osti.gov/api/v1/records?identifier=…` ×6                                   | 200; hits for the report-number accessions, none for `DE85750031` |
