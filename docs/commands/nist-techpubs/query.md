# `nist-techpubs query`

## Synopsis

```text
bulk nist-techpubs query [keys...] [options]
```

Look NIST designations up (Crossref holds every NIST technical-series DOI): title, authors,
date, series, DOI. A designation is written as on the cover ("NIST SP 800-53r5"), dotted
(NIST.FIPS.140-3), or as the 10.6028 DOI; case is kept as written. --resolve follows the DOI
and reports the nvlpubs.nist.gov URL of the PDF.

Keys come from the command line and `--from FILE`; each is normalised, invalid ones are reported and
skipped, and each key is one request.
Answers are cached by normalised key (see [the shared query behaviour](../common.md#query)); a miss is
cached as `null`, an error is not cached.

## Arguments

| Argument  | Required | Description                                             |
| --------- | -------- | ------------------------------------------------------- |
| `keys...` | No       | NIST designations to look up; `--from FILE` reads more. |

## Options

| Option      | Default | Description                                                       |
| ----------- | ------- | ----------------------------------------------------------------- |
| `--resolve` | `false` | Follow the DOI and report the nvlpubs.nist.gov URL the PDF is at. |

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

The table columns are `designation`, `series`, `title`, `authors`, `issued`, `doi`; `--format json`
emits `{ plugin, total, found, skipped, results }` with the full record per key.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk nist-techpubs query "NIST SP 800-53r5" --resolve
bulk nist-techpubs query NIST.FIPS.140-3 10.6028/NIST.SP.800-207
bulk nist-techpubs query --from designations.txt --cache nist.json --tsv nist.tsv
```

## Exit codes

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | At least one key was found.                       |
| `1`   | Nothing valid to look up, or an invocation error. |
| `2`   | No key was found.                                 |
| `130` | Interrupted.                                      |

## Related

- [NIST/NBS Technical Series](../../sources/nist-techpubs/overview.md)
- [Access research](../../sources/nist-techpubs/access.md)
