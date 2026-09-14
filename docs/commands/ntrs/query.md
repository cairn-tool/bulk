# `ntrs query`

## Synopsis

```text
bulk ntrs query [keys...] [options]
```

Look accession numbers up on NTRS (title, report numbers, date, authors, center), or with
--search treat each key as a title and keep the best-matching record.

An accession number is the 11-digit id NTRS files carry (19730060780); the API answers 404
for the Apollo-era records NTRS withdrew in 2013. --search sends each key as a title query
and keeps the best hit whose word overlap with the query is at least --min-score.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                             |
| --------- | -------- | ------------------------------------------------------- |
| `keys...` | No       | accession numbers to look up; `--from FILE` reads more. |

## Options

| Option            | Default | Description                                           |
| ----------------- | ------- | ----------------------------------------------------- |
| `--search`        | `false` | Keys are titles: search NTRS and keep the best match. |
| `--min-score <f>` | `0.6`   | With --search: minimum word overlap to accept a hit.  |

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

The table columns are `key`, `id`, `title`, `reportNumbers`, `date`, `authors`, `center`, `score`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntrs query 19730060780 19660014374
bulk ntrs query --search "Saturn V Flight Manual SA-503" --min-score 0.6
bulk ntrs query --from ids.txt --cache ntrs.json --tsv ntrs.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [NASA Technical Reports Server](../../sources/ntrs/overview.md)
- [Access research](../../sources/ntrs/access.md)
