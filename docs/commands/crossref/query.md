# `crossref query`

## Synopsis

```text
bulk crossref query [keys...] [options]
```

Look DOIs up in Crossref and print title, authors, container, date, type and publisher.

A DOI may be given bare (10.1080/…), as a doi: URI or as a doi.org URL; all three are
normalised. --search treats each key as citation text and reports the best-matching DOIs
instead. --links lists the full-text URLs Crossref knows for the work (publisher PDFs, often
paywalled — `bulk arxiv fetch` or `bulk archive-wayback fetch` may do better).

Requests carry a mailto User-Agent from the configured `contact`, which puts them in Crossref's
polite pool (10 requests/s rather than 5); the advertised limit is then honoured automatically.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                |
| --------- | -------- | ------------------------------------------ |
| `keys...` | No       | DOIs to look up; `--from FILE` reads more. |

## Options

| Option       | Default | Description                                                        |
| ------------ | ------- | ------------------------------------------------------------------ |
| `--search`   | `false` | Treat each key as citation text and report the best-matching DOIs. |
| `--rows <n>` | `5`     | With --search: how many candidates.                                |
| `--links`    | `false` | List the full-text links Crossref knows for each work.             |

Common query options:

| Option           | Default | Description                                          |
| ---------------- | ------- | ---------------------------------------------------- |
| `--from <file>`  | —       | Read keys from FILE, one per line.                   |
| `--cache <file>` | —       | JSON cache of answers (default: plugins.<id>.cache). |
| `--no-cache`     | `false` | Neither read nor write a cache.                      |
| `--refresh`      | `false` | Ask again even for keys the cache has.               |
| `--delay <s>`    | —       | Seconds between requests (default 0.5).              |
| `--tsv <file>`   | —       | Write the records to this TSV.                       |
| `--format <fmt>` | `llm`   | `llm`, `human`, or `json`.                           |
| `--envelope`     | `false` | Wrap `--format json` output in the result envelope.  |
| `--quiet`        | `false` | No progress lines on stderr.                         |
| `-h`, `--help`   | —       | Show help.                                           |

## Output

The table columns are `doi`, `title`, `authors`, `container`, `issued`, `type`, `publisher`, `cited_by`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk crossref query 10.1080/16000870.2018.1440870
bulk crossref query 10.5170/CERN-2004-003-V-1 --links
bulk crossref query --search "Introduction to Algorithms Cormen" --rows 3
bulk crossref query --from dois.txt --cache crossref.json --tsv works.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [Crossref](../../sources/crossref/overview.md)
- [Access research](../../sources/crossref/access.md)
