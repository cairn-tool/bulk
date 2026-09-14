# `archive-items query`

## Synopsis

```text
bulk archive-items query [keys...] [options]
```

Look Internet Archive identifiers up and print title, creator, date, mediatype, collections,
file count and size.

With --search each key is an IA search query instead and the matching identifiers are reported
(with --rows to cap them). With --files the item's files are listed — name, format, size, sha1 —
under the one-line record.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| `keys...` | No       | identifiers to look up; `--from FILE` reads more. |

## Options

| Option       | Default | Description                                                               |
| ------------ | ------- | ------------------------------------------------------------------------- |
| `--search`   | `false` | Treat each key as an IA search query and report the matching identifiers. |
| `--rows <n>` | `50`    | With --search: how many identifiers to report.                            |
| `--files`    | `false` | List each item's files under the one-line record.                         |

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

The table columns are `identifier`, `title`, `creator`, `date`, `mediatype`, `collection`, `files`, `size`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk archive-items query nasa_techdoc_19730060780
bulk archive-items query nasa_techdoc_19730060780 --files
bulk archive-items query --search 'collection:nasa_techdocs AND year:1969' --rows 10
bulk archive-items query --from identifiers.txt --cache ia.json --tsv items.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [Internet Archive items](../../sources/archive-items/overview.md)
- [Access research](../../sources/archive-items/access.md)
