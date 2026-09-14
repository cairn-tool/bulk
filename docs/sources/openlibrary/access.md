# Open Library — access research

What was established, by making the requests rather than reading about them, before the `openlibrary` plugin was written. Ported from the research note `query/_index.md and the title-determination session notes` in the original notes; every request below was actually made. Ported from the query index and the title-determination session (2026-09-13/14) rather than a per-source probe.

## The API

`GET https://openlibrary.org/api/books?bibkeys=ISBN:<a>,ISBN:<b>,…&format=json&jscmd=data` answers with one object per key it knows — twenty ISBNs go in one request. An unknown ISBN is simply absent from the answer, which the plugin records as a miss. Open Library asks for a contact in the User-Agent, so the request carries the polite User-Agent from the configured `contact`.

## Keys

ISBN-10s are converted to ISBN-13 (the `978` prefix and a recomputed check digit) and check digits are verified before anything is sent, so a mistyped key is reported and never costs a request. `--find FILE` extracts ISBNs from free text: `ISBN` labels with 10 or 13 digits, hyphens and spaces tolerated, and bare 13-digit `978`/`979` numbers with a valid check digit.

## What a record carries

Title, subtitle, authors, publish date, publishers, page count, up to twelve subjects, and the Open Library URL — the `jscmd=data` fields.

## Requests made

| Request                                                                       | Result                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `api/books?bibkeys=ISBN:9780262033848,ISBN:0071449590&format=json&jscmd=data` | 200, both keys present (the ISBN-10 answered under its ISBN-13) |
| the same with an unknown ISBN added                                           | 200, the unknown key absent                                     |
