# `ntis-ntrl query`

## Synopsis

```text
bulk ntis-ntrl query [keys...] [options]
```

Look NTIS accession numbers up in the National Technical Reports Library.

Reports title, authors, date, pages, document type, source agency and NTIS subject
categories, and whether NTRL itself offers the document — NTRL's download action returns an
empty body as of 2026-09-14, so "offers" means the link is there, not that it works.
--abstract prints the abstract and keywords too. --search treats each key as search text and
reports the best-matching accession numbers instead of looking one up.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                             |
| --------- | -------- | ------------------------------------------------------- |
| `keys...` | No       | accession numbers to look up; `--from FILE` reads more. |

## Options

| Option       | Default | Description                                                                   |
| ------------ | ------- | ----------------------------------------------------------------------------- |
| `--search`   | `false` | Treat each key as search text and report the best-matching accession numbers. |
| `--rows <n>` | `10`    | With --search: how many results to show.                                      |
| `--abstract` | `false` | Print the abstract and keywords for each record.                              |

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

The table columns are `accession`, `title`, `authors`, `date`, `pages`, `agency`, `ntrl_offers`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntis-ntrl query ADA130537 PB2021100329 ORNLTM3177
bulk ntis-ntrl query ORNLTM3177 --abstract
bulk ntis-ntrl query --search "molten salt reactor" --rows 5
bulk ntis-ntrl query --from accessions.txt --cache ntis.json --tsv ntis.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [National Technical Reports Library (NTIS)](../../sources/ntis-ntrl/overview.md)
- [Access research](../../sources/ntis-ntrl/access.md)
