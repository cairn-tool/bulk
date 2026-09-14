# `openlibrary query`

## Synopsis

```text
bulk openlibrary query [keys...] [options]
```

Look ISBNs up in Open Library and print title, subtitle, authors, date and publisher.

ISBN-10s are converted to ISBN-13 and check digits verified before anything is sent.
Twenty ISBNs go in one request; a cache makes re-runs free for known ISBNs.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and 20 keys go in one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                 |
| --------- | -------- | ------------------------------------------- |
| `keys...` | No       | ISBNs to look up; `--from FILE` reads more. |

## Options

| Option          | Default | Description                                     |
| --------------- | ------- | ----------------------------------------------- |
| `--find <file>` | —       | Extract ISBNs from this text file (repeatable). |

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

The table columns are `isbn`, `title`, `authors`, `date`, `publisher`, `pages`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk openlibrary query 9780071449595 0071449590
bulk openlibrary query --from isbns.txt --cache openlibrary.json --tsv books.tsv
bulk openlibrary query --find some-text-file.txt      # extract ISBNs from text, then look them up
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [Open Library](../../sources/openlibrary/overview.md)
- [Access research](../../sources/openlibrary/access.md)
