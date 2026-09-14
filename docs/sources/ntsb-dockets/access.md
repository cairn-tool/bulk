# NTSB Docket Management System — access research

What was established, by making the requests rather than reading about them, before the `ntsb-dockets` plugin was written. Ported from the research note `acquisition-analysis.md` in the original notes; every request below was actually made. The four NTSB systems were probed in one session; this page carries the shared findings and the section for this system. The other systems: [ntsb-carol](../ntsb-carol/access.md), [ntsb-reports](../ntsb-reports/access.md), [ntsb-avdata](../ntsb-avdata/access.md).

Whether the NTSB's docket and report systems can be read and downloaded
by script, established by probing them on 2026-09-13. Every request below
was actually made, with the `curl` invocation from
[METHOD.md](../../guide/fetching.md); nothing here is inferred from
documentation. The two catalogues the probe produced —
`_ntsb-dockets.tsv` (every docket the system lists, 27,062 rows) and
`_ntsb-reports.tsv` (every published investigation report, 2,006 rows) —
were kept with the original notes; `bulk ntsb-dockets list --tsv` and `bulk ntsb-reports list --tsv` regenerate them. The repeatable pulls live in
[../scripts/_index.md](../../commands.md).

## The short answer

**The earlier session never touched the NTSB.** The catalogue-sources
table in [processing-log.md](../../guide/fetching.md)
lists nine sources fetched and three blocked; NTSB is not among them,
because the docket files carried their exhibit title in the file name and
no lookup was needed (4,326 A-grade titles "from the file name"). This is
the first time the site has been accessed here.

**It is entirely open to scripts.** Four systems, four mechanisms, none
of them a challenge, a login or a rate limit:

| System                            | Host                                                                       | Mechanism                                                          | What one request yields                                                                  |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Docket Management System (search) | `data.ntsb.gov/Docket/Forms/searchdocket`                                  | Razor Pages form POST with an antiforgery token                    | **All 27,062 dockets in one 897 KB response, 2.5 s**                                     |
| Docket Management System (docket) | `data.ntsb.gov/Docket?ProjectID=`                                          | **Server-rendered HTML** — every item in the docket, no JavaScript | TWA 800: all 3,412 items, 108 KB                                                         |
| Docket Management System (file)   | `data.ntsb.gov/Docket/Document/docBLOB`                                    | Plain GET; `FileName` must match exactly                           | The PDF, byte-identical to the 2023 archive copy                                         |
| CAROL (case database)             | `data.ntsb.gov/carol-main-public/api/`                                     | JSON API behind the SPA, one session call first                    | 181,844 cases queryable; full case records with narratives exported as JSON              |
| Investigation reports             | `www.ntsb.gov/investigations/AccidentReports/_api/web/Lists/Reports/items` | SharePoint REST, anonymous                                         | **All 2,006 reports (4.55 GB of PDF) in one 1.7 MB response, 6.8 s**; PDFs by direct URL |
| Aviation database dumps           | `data.ntsb.gov/avdata/`                                                    | Static links                                                       | `avall.zip` 96 MB, monthly `upNNMMM.zip`, `Pre2008.zip` 155 MB                           |

Cloudflare fronts `data.ntsb.gov` (it sets `__cf_bm`), but nothing is
challenged: the default `curl` user agent is served the same bytes as a
browser one, and ten docket files fetched back-to-back at ~3 requests/s
all returned in 0.2–1.2 s with no 429. `www.ntsb.gov/robots.txt`
disallows SharePoint system paths (`/_layouts/`, `/_vti_bin/`, `/Lists/`)
but not `/investigations/AccidentReports/_api/`; `data.ntsb.gov` has no
robots file (the path returns the SharePoint not-found page);
`app.ntsb.gov` — the legacy brief generator — disallows everything, so
that host should not be used when the CAROL equivalent exists.

## 1. The docket system

### Search — one POST enumerates everything

`/Docket/Forms/searchdocket` is an ASP.NET Razor page. The form needs the
`__RequestVerificationToken` hidden field _and_ the cookie the GET sets,
so the sequence is GET the form with a cookie jar, extract the token,
POST with the same jar:

```bash
curl -sS --compressed -A "$UA" -c cj.txt -o form.html \
     https://data.ntsb.gov/Docket/Forms/searchdocket
TOK=$(grep -o 'name="__RequestVerificationToken" type="hidden" value="[^"]*"' form.html \
      | sed 's/.*value="//;s/"$//')
curl -sS --compressed -A "$UA" -b cj.txt -c cj.txt -o search.html \
     --data-urlencode "SearchDocketCriteria.NTSBNumber=" \
     --data-urlencode "SearchDocketCriteria.City=" \
     --data-urlencode "SearchDocketCriteria.State=" \
     --data-urlencode "SearchDocketCriteria.Mode=" \
     --data-urlencode "SearchDocketCriteria.StartDate=1900-01-01" \
     --data-urlencode "SearchDocketCriteria.EndDate=2026-12-31" \
     --data-urlencode "__RequestVerificationToken=$TOK" \
     https://data.ntsb.gov/Docket/Forms/searchdocket
```

Fields: `NTSBNumber`, `City`, `State` (two-letter), `Mode` (`Aviation`,
`Marine`, `Highway`, `Rail`, `Pipeline`, `Hazmat`, `Non-Modal`, or blank
for all), `StartDate`/`EndDate` (`yyyy-mm-dd`). **There is no paging and
no result cap**: a whole-year search returned 1,361 rows, the all-time
search above returned `Docket Search Result: 27062 Dockets` as one
`<table id="resultTable">`. Each row: `Accident ID` linked to
`/Docket?ProjectID=<n>`, date, city/state, docket type, description. A
project with several sub-dockets appears once per sub-docket (TWA 800 is
11 rows, one project) — 27,052 distinct projects.

What the docket universe looks like (`_ntsb-dockets.tsv`):

| Measure                  | Value                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows / distinct projects | 27,062 / 27,052                                                                                                                                                                                    |
| By type                  | Aviation 25,503 · Marine 793 · Highway 352 · Rail 253 · Pipeline 74 · Hazmat 45 · safety studies and board events 32                                                                               |
| By accident year         | 10 before 1993 (the earliest 1971); 48–101 a year 1993–1999; 793 in 2025, 206 so far in 2026                                                                                                       |
| By office prefix         | CEN 6,839 · ERA 6,053 · WPR 5,201 · GAA 2,508 · **DCA 1,627** (the major-investigation office: 793 marine, 598 aviation, 116 rail) · ANC 1,505 · LAX/CHI/NYC/SEA/FTW/… the pre-2008 regional codes |

### A docket page is the whole docket, server-rendered

`https://data.ntsb.gov/Docket?ProjectID=11011` and
`https://data.ntsb.gov/Docket/?NTSBNumber=DCA96MA070` return the same
page: a header block (Description, Mode, NTSB Number, Date of Accident,
City, State, Country, Project Type, **Creation Date, Last Modified,
Public Release Date**), a link `TOCPrintable?data=<ProjectID>` to a
printable table of contents, and then, for each sub-docket, a
`Docket Items: <n>` heading and a table with one row per item:

| Column  | Content                                                                                                                             | Example                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `#`     | Item number within the sub-docket                                                                                                   | `1`                                                                      |
| `Title` | The exhibit title as catalogued                                                                                                     | `Witness 4 - Missile Visibility Study - Appendix B - Observer Worksheet` |
| `Pgs`   | Page count                                                                                                                          | `2`                                                                      |
| `Photo` | Photo count (0 in the 1990s dockets; 20–49 on some SWA 1380 items)                                                                  | `0`                                                                      |
| `Type`  | `Adobe PDF file`, `Text/Image`, `Text/Image (PDF or TIFF)`, `Comma-delimited data file`, `GIF image`, `zip`, `kml`, `xlsx`, `Other` |                                                                          |
| `File`  | `<a href="/Docket/Document/docBLOB?ID=<id>&FileExtension=<ext>&FileName=<name>">View</a>`                                           |                                                                          |

The rows are plain HTML in the response — the regex
`<tr>\s*<td><b>(\d+)</b></td>\s*<td>(.*?)</td>\s*<td><b>(\d*)</b></td>\s*<td>(\d*)</td>\s*<td>([^<]*)</td>\s*<td>\s*<a target="_blank" href="([^"]+)">`
recovered every one of TWA 800's 3,412 items. Two conventions coexist:
the 1990s dockets carry `FileExtension=.PDF` (dot, upper case) and a
`FileName` that _is_ the title plus a `-Master` or `-Redacted` suffix;
dockets from about 2018 carry `FileExtension=pdf` (no dot), a `FileName`
that is the investigator's working file name (`DCA19MA086 - Ops_HP
Factual (FINAL) ver 7.0 (Tech Review ready)-Rel.pdf`) distinct from the
catalogued `Title`, and non-PDF items (CSV, KML, MP4, WAV, XLSX, zip).

### The file endpoint has one trap

`docBLOB` needs all three parameters, and `FileName` must be **exactly
the catalogued name**. The failure modes are both HTTP 200:

| Request                                           | Result                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ID` + `FileExtension` + correct `FileName`       | `200 application/pdf`, `Content-Disposition: attachment; filename="…"`, the file                   |
| `ID` alone, or `ID` + `FileExtension`             | `200 text/html`, a 3 KB empty page shell                                                           |
| `ID` + `FileExtension` + **any other** `FileName` | **`200 application/pdf`, `Content-Length: 0`** — the disposition header echoes the wrong name back |

So a downloader must copy the `href` verbatim (HTML-unescaping `&amp;`)
and verify size > 0 and the `%PDF-` magic on every file, exactly the
discipline [METHOD.md](../../guide/fetching.md)
already requires. Once that is done the bytes are the archive's bytes:
item 1 of TWA 800 came back at 19,373 bytes, items 3 and 5 at 53,182 and
53,233 — the sizes `_inventory.tsv` records for the same files — and the
first nine Fine Air 101 items matched the archive size for size.

### The archive's seven dockets against the live system

| Archive folder    | Docket                                    |                                                           Live items |             Archive files | Reading                                                                                                                                                                              |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------: | ------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TWA 800/`        | DCA96MA070, project 11011, 11 sub-dockets |                                                      3,412 (all PDF) |                     3,412 | Complete                                                                                                                                                                             |
| `Fine Air 101/`   | DCA97MA059, project 11028                 |                                                                   74 |                        74 | Complete; all 74 names match once `%2F` is decoded and the truncated photo captions are prefix-matched                                                                               |
| `UPS 1354/`       | DCA13MA133, project 87780                 |                                          137 (134 PDF, 2 CSV, 1 zip) |                       134 | Every PDF; the three data files were not taken                                                                                                                                       |
| `Southwest 1380/` | DCA18MA142, project 97056                 |                             53 (46 PDF, 3 KML, 2 XLSX, 1 CSV, 1 GIF) |                        46 | Every PDF                                                                                                                                                                            |
| `Atlas Air 3591/` | DCA19MA086, project 99013                 |                       78 (67 PDF, 3 CSV, 5 video, 2 audio, 1 `.ppb`) |                        67 | Every PDF                                                                                                                                                                            |
| `DELTA 1288/`     | DCA96MA068, project 11010                 |                                                              **183** | 602 (a copy of USAir 427) | The real docket exists and was never downloaded                                                                                                                                      |
| `USAIR 427/`      | DCA94MA076, project 10987                 | **11** — CVR sound-spectrum addenda only; _Last Modified 06/09/2026_ |                       602 | **The live docket was rebuilt this year and holds 11 items. The archive's 602 — RPCU test reports, Boeing submission, factual reports, hearing transcripts — are no longer online.** |

Two conclusions for any automated pull. The archive's downloader took
PDFs only, so re-pulling the four post-2013 dockets adds 22 data and
media files. And **dockets are mutable**: a harvest must record the
page's `Last Modified` and item count as the state it saw, and a
re-harvest must diff against that rather than assume the site is a
superset of the archive — for USAir 427 the archive is now the only copy.

## 5. A pipeline that would work

Everything needed is a catalogue request, a manifest, and the same
verified-fetch loop the research skills already run.

**Enumerate** (three requests, re-run monthly):

1. The docket search POST → `_ntsb-dockets.tsv` (project id, NTSB
   number, date, place, type, description).
2. The SharePoint `Reports` list GET → `_ntsb-reports.tsv` (report
   number, mode, accident ids, `Mkey`, adopted date, title, URL, bytes).
3. CAROL `FileExport` per calendar year (`summary` for the URL columns,
   `data` when narratives and findings are wanted) — ~130 cases a month,
   1,700 a year, comfortably under the 10,000 export cap.

**Select** — the decision that sets the volume. All 27,052 dockets is a
crawl of unknown size (TWA 800 alone is 800 MB, a typical GA docket a few
MB); the 1,627 DCA-office dockets are the major investigations and the
natural scope for an archive that already holds seven of them; the
1,117 dockets that have a published report are another. The reports
library is 4.55 GB and is the obvious first pull — every file is listed
with its byte count, so completeness is checkable.

**Harvest a docket** — one page fetch, then one file fetch per row:

1. GET `/Docket?ProjectID=<id>`; record the header fields (`Last
Modified`, `Public Release Date`, item counts) as the docket's state.
2. Parse the rows into a manifest: sub-docket, item number, title,
   pages, photo count, type, `ID`, extension, catalogued file name, href.
3. For each row, GET the href verbatim; accept only `size > 0` and the
   right magic (`%PDF-`, `PK`, `RIFF`, …) — the 0-byte 200 is the
   failure to catch; record status, bytes and SHA-256 against the
   manifest row.
4. Name the file from the `Title` column, not from `FileName`: the
   title is what the proposal's rule already reconstructs by decoding
   `%2F` and dropping the DMS suffix
   ([organization-proposal.md](../../guide/fetching.md)),
   and for the 2018+ dockets the title is the exhibit name while
   `FileName` is a working name. Zero-pad the group number as the
   proposal does; keep `-Redacted` in parentheses when the docket holds
   both versions; keep the manifest as the mapping.
5. Pace at METHOD's 2 s / 5 s per host. TWA 800's 3,412 items are then
   about five hours; the DCA set, at a guess of 100–200 items a docket,
   a few days of unattended running.

**Harvest reports** — GET each `ServerRelativeUrl` from the list,
verify the byte count against `Length` and the `%PDF-` magic, name
`<file stem> - <Title>.pdf` under a folder per mode. The file stem
(`AAR0003`, `MIR2628`) is the key, not `NTSBReportNumber`: the list has
numbers mistyped onto the wrong file (`AAB-07-01` on `AAR0701.pdf`,
`AAR-87-02` on `AAR8707.pdf`). This is implemented in
[`bulk ntsb-reports fetch`](../../commands.md) — it fetches the list, writes
`_manifest.tsv` and `_download-log.tsv` into the destination, skips files
already present at their listed size, and prints `[n/total] pct%` per file.

**Re-harvest** — the docket page's `Last Modified` and item count, the
report item's `Modified`, and the CAROL `DocketPublishDate` are the
change signals; a docket whose count fell (USAir 427: 602 → 11) is a
finding to record, not a reason to delete.

## Requests made

| #         | Request                                                                                                      | Result                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | GET `data.ntsb.gov/Docket/?NTSBNumber=DCA96MA070`                                                            | 200 html 108 KB — the full TWA 800 docket, 3,412 `docBLOB` links                                                                                 |
| 2         | GET `data.ntsb.gov/carol-main-public/basic-search`                                                           | 200 html 2 KB — SPA shell, Cloudflare beacon, no challenge                                                                                       |
| 3         | GET `www.ntsb.gov/`                                                                                          | 200 html 18 KB — SharePoint                                                                                                                      |
| 4         | GET `data.ntsb.gov/avdata/`                                                                                  | 200 html 158 KB — the file directory                                                                                                             |
| 5–13      | GET `docBLOB` with correct, missing and wrong `FileName`, browser and default UA                             | Correct name: PDF at the archive's byte size, either UA. Missing name: 200 html 3 KB. Wrong name: 200 `application/pdf` 0 bytes                  |
| 14        | GET `Docket/TOCPrintable?data=11011`                                                                         | 200 html 60 KB printable contents                                                                                                                |
| 15, 18–19 | GET `Docket/`, `Docket/Forms/searchdocket`                                                                   | The form: token, state and mode selects                                                                                                          |
| 20–22     | POST search: July 1996 aviation; all of 2019; 1900–2026 all modes                                            | 16, 1,361, **27,062** rows; the last 897 KB in 2.5 s                                                                                             |
| 16, 23    | GET dockets 99013, 10987, 87780, 11028, 97056, 11010                                                         | 78, 11, 137, 74, 53, 183 items                                                                                                                   |
| 24–32     | GET nine CAROL component scripts                                                                             | Located `api/Query/Main`, `api/Query/FileExport`, `api/Session/CreateSession`, `api/Query/BasicSearchTemplate`, `api/Lookup/ClientSettings/List` |
| 33–34     | GET `ClientSettings/List`, `BasicSearchTemplate`                                                             | The URL templates; the 16-rule query template                                                                                                    |
| 35        | POST `Query/Main`, hand-built rule                                                                           | **500** `"An unknown exception occured."`                                                                                                        |
| 36        | GET / POST `Session/CreateSession`                                                                           | 405 / 200 `1170164`                                                                                                                              |
| 37–40, 54 | POST `Query/Main`, template rules: TWA 800; 2019; March 2019; offsets; 2018–19; half-years; all time; Marine | 1 · 1,696 · 131 · paging works · 3,458 · 804 + 892 · **181,844** · 586                                                                           |
| 41        | POST `Query/FileExport` `data` and `summary`, March 2019                                                     | Zips of 237 KB (1.2 MB JSON, 131 full cases) and 28 KB (CSV with `DocketUrl`, `ReportUrl`)                                                       |
| 42        | GET `carol-repgen/…/GenerateNewestReport/99196/pdf`                                                          | 200 pdf 827 KB, 3.6 s                                                                                                                            |
| 43–45     | GET `AAR0003.pdf`, `Pages/DCA96MA070.aspx`, `AAR2201.pdf`                                                    | 9.4 MB PDF · the investigation page · **200 html "Page not found"**                                                                              |
| 46–47     | GET `Pages/Reports.aspx`, `main.js`, `ntsb.js`                                                               | "reports are loading…"; the REST query in `main.js`                                                                                              |
| 48–49     | GET `_api/web/Lists/Reports/items` `$top=5`, `$top=5000`                                                     | 5 with `__next` · **2,006, no `__next`**, 1.7 MB in 6.8 s                                                                                        |
| 50–51     | GET `avdata/…/DownloadFile` `avall.zip` (with `Range: 0-4095`), `codman.pdf`                                 | 96,148,686 bytes, range ignored · 124 KB PDF                                                                                                     |
| 52        | GET ten Fine Air 101 items back-to-back                                                                      | All 200 pdf, 0.2–1.2 s each, sizes equal to the archive's                                                                                        |
| 53        | GET `app.ntsb.gov/pdfgenerator/ReportGeneratorFile.ashx?EventID=20001212X19583&…`                            | 200 pdf 99 KB (host's robots: `Disallow: /`)                                                                                                     |
| —         | GET `robots.txt` on `data`, `www`, `app`                                                                     | not-found page · SharePoint system paths only · everything                                                                                       |

Working files (raw responses, the parsed JSON, the ten test PDFs) are in
the session scratchpad and were not kept; the two TSVs are the durable
output.

## Data files

| File                | Rows   | Contents                                                                                                                                                                                                                                     |
| ------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_ntsb-dockets.tsv` | 27,062 | Every docket the search returns for 1900–2026, all modes, as of 2026-09-13: `project_id`, `ntsb_number`, `date`, `city_state`, `type`, `description`. One row per sub-docket; `project_id` is the `Docket?ProjectID=` key and CAROL's `Mkey` |
| `_ntsb-reports.tsv` | 2,006  | Every item in the `Reports` SharePoint list as of 2026-09-13: `id`, `report_number`, `mode`, `accident_id`, `mkey`, `adopted`, `accident_date`, `title`, `file` (server-relative URL), `bytes`                                               |
