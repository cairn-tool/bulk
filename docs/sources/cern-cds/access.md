# CERN Document Server — access research

What was established, by making the requests rather than reading about them, before the `cern-cds` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made. The Yellow Reports section of the same note is on [cern-yellowreports](../cern-yellowreports/access.md).

Probed 2026-09-13 for `bulk cern-cds fetch`. CDS is an Invenio instance;
its search API is documented at
`cds.cern.ch/help/hacking/search-engine-api` — `GET /search?p=<pattern>&of=xm|recjson&ot=<tags>&jrec=<n>&rg=<n>`,
paged with `jrec`/`rg`, MARCXML (`xm`) or JSON (`recjson`) output. That
documentation is correct and the command implements it. From this
network, though, **every request to `/search`, `/record/<id>`,
`/record/<id>/files/<file>`, `/api/…` and even the help page itself is
answered with an Anubis proof-of-work challenge page** (`Making sure
you're not a bot!`, difficulty 4, `/.within.website/`), HTTP 200,
whatever the user agent — browser, curl's own, `python-requests`,
Googlebot. `http://` and `cdsweb.cern.ch` redirect into the same gate;
`doi.org/10.5170/…` resolves to it.

**The Anubis challenge is solvable, and the command solves it.** It is a
proof-of-work, not a CAPTCHA: the page carries
`#anubis_challenge` = `{"rules": {"algorithm": "fast", "difficulty": 4},
"challenge": {"id", "randomData", …}}` and sets a short verification
cookie tied to `id`. The "fast" proof is a nonce for which
`sha256(randomData + nonce)` has 4 leading hex zeros — about 60,000
tries, **under 100 ms** in Python. Presenting `response` (the hash),
`nonce`, `id` and an `elapsedTime` to
`/.within.website/x/cmd/anubis/api/pass-challenge` returns a
`techaro.lol-anubis-auth-*` JWT cookie, **valid about one hour** and
good for the whole host. `the challenge solver`'s `anubis` solver does this
and caches the cookie under `~/.cache/bulk/anubis/cds.cern.ch.jar`; the
command sends it on `/search` and every file request. Solving is a
compute toll paid for the archive owner's own bulk pull at the pull's
pacing.

| Route                                               | Status                                                                                                                                                                                                                                                                                                                                   | Used for                                                                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`/oai2d`** (OAI-PMH)                              | **Open, no challenge.** `Identify`, `ListSets` (44 sets: `cerncds:FULLTEXT`, `cerncds:BOOK`, `cerncds:REPORT`, `cerncds:SCAN`, `cerncds:TALK:FULLTEXT`, the arXiv mirrors, `INIS`, …), `ListMetadataFormats` (`marcxml`, `oai_dc`), `ListRecords` with `set`/`from`/`until` and resumption tokens, `GetRecord` by `oai:cds.cern.ch:<id>` | The catalogue for `--set` and `--record`: MARCXML per record, its 856 fields carrying every file's URL (`$u`), byte count (`$s`) and label (`$y`)                                                      |
| `/search?of=xm`                                     | Anubis, **solved**                                                                                                                                                                                                                                                                                                                       | The catalogue for `--query`; sent with the cached cookie                                                                                                                                               |
| `/record/<id>/files/<name>`                         | Anubis, **solved**                                                                                                                                                                                                                                                                                                                       | Every file — pulled straight from CDS with the cached cookie, byte-exact against the 856 `$s`                                                                                                          |
| **INSPIRE-HEP** `inspirehep.net/api/literature?q=…` | Open, JSON                                                                                                                                                                                                                                                                                                                               | The `--no-anubis` fallback for files: INSPIRE holds the fulltext of many CERN records under `inspirehep.net/files/<hash>`; looked up by INSPIRE id (MARC 035 `$9 Inspire`), CDS id, then report number |
| `/rss`, `make-challenge`                            | 403 / 404                                                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                      |

MARC fields used: 001 record id, 037/088 report number, 245 title,
260/269 date, 035 (Inspire) id, 856 files. CDS lists derivative files
(`?subformat=icon-700`, `?subformat=pdfa`) beside the originals; the
command skips them unless `--all-formats`.

**Mutability.** Records are revised (the OAI `datestamp`); a re-pull is
`--set … --from <last run>`. The auth cookie lasts ~1 h; a pull longer
than that re-solves when the cached cookie nears expiry (the solver
refreshes within a 10-minute margin at the start of each run).

**The archive holds** 141 CERN files (`Agencies/CERN/LHC` — the LHC
Design Report chapters, project reports), titled from CDS report numbers.

## Requests made

| Request                                                                                                                                                               | Result                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `help/hacking/search-engine-api?ln=en`, `search?p=reportnumber:CERN-2004-003-V1&of=recjson` (browser, curl, python, Googlebot UAs)                                | 200 `text/html`, 7.5 KB, the Anubis challenge                                                                                                                                                                                           |
| GET `oai2d?verb=Identify`                                                                                                                                             | 200 `text/xml`                                                                                                                                                                                                                          |
| GET `record/823808?of=recjson`, `record/823808/export/xm`, `record/823808/files/lhc-vol1.pdf`, `api/records/823808`, `search?…&of=xm`, `http://…`, `cdsweb.cern.ch/…` | challenge                                                                                                                                                                                                                               |
| GET `rss?p=…`                                                                                                                                                         | 403                                                                                                                                                                                                                                     |
| GET `oai2d?verb=GetRecord&metadataPrefix=marcxml&identifier=oai:cds.cern.ch:823808`                                                                                   | 200; LHC Design Report v.3, 856: `CERN-2004-003-V3.pdf` 15,932,919 bytes, TOC 370,541                                                                                                                                                   |
| GET `oai2d?verb=ListSets`, `ListMetadataFormats`                                                                                                                      | 44 sets; marcxml, oai_dc                                                                                                                                                                                                                |
| GET `oai2d?verb=ListRecords&metadataPrefix=marcxml&set=cerncds:BOOK&from=2026-01-01`                                                                                  | 200, 24 records                                                                                                                                                                                                                         |
| GET `inspirehep.net/api/literature/673262`; `…?q=reportnumber:CERN-2004-003-V-1`                                                                                      | 200 JSON; vol. 1 has `documents[].url = inspirehep.net/files/77c1…`, vol. 3 has none                                                                                                                                                    |
| GET `doi.org/10.5170/CERN-2004-003-V-3`                                                                                                                               | → `cds.cern.ch/record/823808`, challenge                                                                                                                                                                                                |
| Command tests                                                                                                                                                         | `--record 782076 --record 823808`: vol. 1 fetched from INSPIRE (26.9 MB), three CDS files failed with the challenge page as logged; `--set cerncds:BOOK --from 2026-08-01 --list` 6 records; `--query` stops with the challenge message |
