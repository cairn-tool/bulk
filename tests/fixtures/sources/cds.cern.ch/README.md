# cds.cern.ch / inspirehep.net fixtures

CDS as observed on 2026-09-13: `/oai2d` answers MARCXML (namespaced) openly — ListRecords with an 856 file and an icon derivative, GetRecord, and a `noRecordsMatch` error; `/record/…`, `/search` and every file answer the Anubis challenge page (difficulty 1 here) until the request carries an `anubis-auth` cookie, which `pass-challenge` sets while redirecting back. `/search?of=xm` answers bare, un-namespaced MARC with the total in a comment. INSPIRE holds the same file for the `--no-anubis` route.
