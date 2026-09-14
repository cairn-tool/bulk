# `nist-techpubs list`

## Synopsis

```text
bulk nist-techpubs list [options]
```

Enumerates the catalogue with the same selection options as [`nist-techpubs fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`designation`, `date`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                | Default | Description                                                                          |
| --------------------- | ------- | ------------------------------------------------------------------------------------ |
| `--id <desig>`        | —       | A designation, DOI or doi.org URL ("NIST SP 800-53r5", NIST.FIPS.140-3); repeatable. |
| `--series <code>`     | —       | A series: SP, FIPS, IR, TN, CIRC, HB … or qualified (NIST.SP, NBS.CIRC); repeatable. |
| `--query <words>`     | —       | Every word must appear in the title.                                                 |
| `--author <name>`     | —       | A personal or corporate author.                                                      |
| `--subject <words>`   | —       | Words in the subject headings.                                                       |
| `--doi <doi>`         | —       | The exact DOI.                                                                       |
| `--from <yyyy>`       | —       | Published in or after this year.                                                     |
| `--until <yyyy>`      | —       | Published in or before this year.                                                    |
| `--refresh-catalogue` | `false` | Take the catalogue again even if it is here.                                         |

Common list options:

| Option               | Default   | Description                                            |
| -------------------- | --------- | ------------------------------------------------------ |
| `--delay <s>`        | —         | Seconds between catalogue requests.                    |
| `--limit <n>`        | —         | Stop after N rows (default: all).                      |
| `--list-file <file>` | —         | Use a saved catalogue response instead of fetching it. |
| `--tsv <file>`       | —         | Write the rows to this TSV instead of printing them.   |
| `--dest <dir>`       | temporary | Keep the catalogue snapshot in this directory.         |
| `--format <fmt>`     | `llm`     | `llm`, `human`, or `json`.                             |
| `--envelope`         | `false`   | Wrap `--format json` output in the result envelope.    |
| `--quiet`            | `false`   | No progress lines on stderr.                           |
| `-h`, `--help`       | —         | Show help.                                             |

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk nist-techpubs list --id "NIST SP 800-53r5" --id NIST.FIPS.140-3
bulk nist-techpubs list --series SP --from 2015 --limit 50
bulk nist-techpubs list --series NBS.CIRC
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`nist-techpubs fetch`](fetch.md)
- [NIST/NBS Technical Series](../../sources/nist-techpubs/overview.md)
