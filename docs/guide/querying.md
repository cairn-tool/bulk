# Querying

Why the `query` commands exist: a document in an archive is often known only by an identifier
printed on its cover — an ISBN, a DOI, a report designation, an accession number — and the
catalogue that resolves it is a public API with its own quirks. `bulk <plugin> query` turns
identifiers into records, remembers the answers, and reports what it could not resolve.

```bash
bulk openlibrary query 9780262033848 0-07-144959-0
bulk crossref query --from dois.txt --cache crossref.json --tsv works.tsv
bulk osti query ORNL-TM-2578 WASH-1250
bulk ntrs query --search "Saturn V Flight Manual SA-503"
```

## Normalisation before the request

Each plugin knows what a valid key looks like and sends only those: an ISBN-10 becomes an
ISBN-13 with its check digit verified; a `doi:` URI or doi.org URL becomes a bare DOI; an NTIS
accession number loses its punctuation and case; an OSTI designation's `-V1` becomes OSTI's
`-VOL.1`. A key that cannot be normalised is reported as skipped and never costs a request — and
never pollutes the cache with a miss for a typo.

## The cache, and what a miss means

Answers are cached by normalised key ([format](../formats/query-cache.md)). A key the service does
not know is cached as `null`: a re-run costs nothing for it, and `--refresh` asks again when the
service may have gained the record. An error — a 5xx, a timeout — is never cached; the run reports
it and the next run tries again. The distinction matters for a list of a thousand keys run twice.

## Search modes

Several plugins have a search form alongside the lookup: `--search` on `crossref` (citation
text), `ntrs` (a title, scored by word overlap against the hits), `archive-items` (the IA search
syntax) and `ntis-ntrl` (NTRL's own search); `usda-nal` is a search by nature. The best hit is the
record in the table, and `--format json` carries every candidate, so a caller can apply its own
threshold.

## Where the records come from

| Plugin          | Service                                     | Key                               |
| --------------- | ------------------------------------------- | --------------------------------- |
| `crossref`      | `api.crossref.org/works`                    | DOI                               |
| `openlibrary`   | `openlibrary.org/api/books`                 | ISBN                              |
| `ntrs`          | `ntrs.nasa.gov/api/citations`               | NASA accession number, or a title |
| `osti`          | `www.osti.gov/api/v1/records?identifier=`   | report designation                |
| `nist-techpubs` | Crossref, `10.6028/<designation>`           | NIST designation                  |
| `ntis-ntrl`     | `ntrl.ntis.gov` title-detail page           | NTIS accession number             |
| `archive-items` | `archive.org/metadata/<identifier>`         | item identifier                   |
| `usda-nal`      | `search.nal.usda.gov/primaws/rest/pub/pnxs` | search text                       |

Records keep the service's own identifier and URL so an answer can be checked at the source.
