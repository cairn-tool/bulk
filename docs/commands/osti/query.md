# `osti query`

## Synopsis

```text
bulk osti query [keys...] [options]
```

Look report designations up on OSTI.GOV: title, authors, date, OSTI id, DOI.

A designation is the report number on the cover (ORNL-TM-2578, WASH-1250); volume and
revision suffixes are rewritten to OSTI's form (-V1 → -VOL.1, REV2 → -REV.2). Several records
can match one designation (volumes, revisions); the first is reported in the table and all of
them in --format json.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                               |
| --------- | -------- | --------------------------------------------------------- |
| `keys...` | No       | report designations to look up; `--from FILE` reads more. |

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |

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

The table columns are `designation`, `report_number`, `title`, `date`, `authors`, `osti_id`, `doi`, `matches`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk osti query ORNL-TM-2578 ORNL-4541 WASH-1250
bulk osti query --from designations.txt --cache osti.json --tsv osti.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [OSTI.GOV](../../sources/osti/overview.md)
- [Access research](../../sources/osti/access.md)
