# NTSB aviation database dumps — access research

What was established, by making the requests rather than reading about them, before the `ntsb-avdata` plugin was written. Ported from the research note `acquisition-analysis.md` in the original notes; every request below was actually made. The four NTSB systems were probed in one session; this page carries the shared findings and the section for this system. The other systems: [ntsb-dockets](../ntsb-dockets/access.md), [ntsb-carol](../ntsb-carol/access.md), [ntsb-reports](../ntsb-reports/access.md).

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

## 4. The aviation database dumps

`https://data.ntsb.gov/avdata/` is a static directory page: `avall.zip`
(96,148,686 bytes, rebuilt monthly — 2026-09-01 at the time of the
probe), `Pre2008.zip` (154.5 MB, 2023-08-21), `PRE1982.zip`, twelve
`upNNMMM.zip` monthly deltas (0.5–0.9 MB), the schema PDFs `codman.pdf`
(124 KB, verified) and `eadmspub.pdf`, and `MDB_Release_Notes.pdf`.
Download URL: `/avdata/FileDirectory/DownloadFile?fileID=C%3A%5Cavdata%5C<file>`
— `application/octet-stream` with a `Content-Disposition`; `Range` is
ignored (a 4 KB range request received all 96 MB), so partial resumes
are not possible.

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
