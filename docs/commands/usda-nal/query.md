# `usda-nal query`

## Synopsis

```text
bulk usda-nal query [keys...] [options]
```

Search the National Agricultural Library catalogue and report the best matches.

Each key is search text. --field picks the index it is searched in (any, title, creator,
subject, isbn, issn); --scope picks the collection (agricola, pubag, or MyInstitution for
everything). --rows sets how many candidates are considered; the best is reported in the
table and all of them in --format json.

Records are bibliographic. `bulk usda-treesearch fetch` is the command that downloads USDA documents.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                        |
| --------- | -------- | -------------------------------------------------- |
| `keys...` | No       | search texts to look up; `--from FILE` reads more. |

## Options

| Option            | Default         | Description                                                                                     |
| ----------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `--field <index>` | `any`           | The index each key is searched in. One of `any`, `title`, `creator`, `subject`, `isbn`, `issn`. |
| `--scope <scope>` | `MyInstitution` | The collection searched. One of `agricola`, `pubag`, `MyInstitution`.                           |
| `--rows <n>`      | `5`             | Candidates considered per key.                                                                  |

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

The table columns are `search`, `title`, `creators`, `date`, `type`, `publisher`, `doi`, `matches`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk usda-nal query "soybean rust"
bulk usda-nal query "Bromfield soybean rust" --field creator --rows 3
bulk usda-nal query 9780890540626 --field isbn
bulk usda-nal query --scope pubag --from titles.txt --tsv nal.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [USDA National Agricultural Library catalogue](../../sources/usda-nal/overview.md)
- [Access research](../../sources/usda-nal/access.md)
