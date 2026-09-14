# Query cache

A JSON object keyed by the **normalised** key — the ISBN-13, the bare DOI, the upper-case
accession number — with the record as its value, or `null` for a key the service does not know:

```json
{
  "9780262033848": { "title": "Introduction to Algorithms", "authors": ["Thomas H. Cormen"] },
  "9780000000002": null
}
```

Where it lives: `--cache FILE`, else `plugins.<id>.cache` in the configuration (`true` means
`<cache dir>/query/<plugin>.json`; a path means that file), else nowhere (`--no-cache` forces
that). It is saved after every batch, atomically, so an interrupted run keeps what it learned.

A miss is cached so a re-run costs no request for it; `--refresh` asks again. An error is never
cached: the run reports it and the next run tries again. Records are stored exactly as the plugin
shaped them, so the cache doubles as a TSV-able export of everything looked up.
