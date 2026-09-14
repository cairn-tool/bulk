# `osti list`

## Synopsis

```text
bulk osti list [options]
```

Enumerates the catalogue with the same selection options as [`osti fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`identifier`, `date`, `text`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option                      | Default | Description                                        |
| --------------------------- | ------- | -------------------------------------------------- |
| `--query <q>`               | —       | The API's general `q` — searches the whole record. |
| `--identifier <id>`         | —       | Report or contract number (ORNL-TM-2578).          |
| `--osti-id <n>`             | —       | The OSTI identifier.                               |
| `--doi <doi>`               | —       | The DOI.                                           |
| `--author <name>`           | —       | Author.                                            |
| `--title <words>`           | —       | Words in the title.                                |
| `--subject <words>`         | —       | Subject category or keyword.                       |
| `--research-org <org>`      | —       | Research organisation (Oak Ridge National Lab).    |
| `--sponsor-org <org>`       | —       | Sponsoring organisation.                           |
| `--fulltext-search <words>` | —       | Search inside the full text.                       |
| `--from <date>`             | —       | Publication date on or after (YYYY[-MM[-DD]]).     |
| `--until <date>`            | —       | Publication date on or before (YYYY[-MM[-DD]]).    |
| `--by-entry-date`           | `false` | Apply --from/--until to the entry date instead.    |
| `--citations-only-too`      | `false` | Do not restrict to records that have full text.    |
| `--sort <field>`            | —       | Sort field (publication_date, entry_date, …).      |
| `--order <dir>`             | `desc`  | Sort order. One of `asc`, `desc`.                  |

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
bulk osti list --identifier ORNL-TM-2578
bulk osti list --research-org "Oak Ridge National Lab" --from 1965 --until 1975 --limit 50
bulk osti list --query "molten salt reactor"
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`osti fetch`](fetch.md)
- [OSTI.GOV](../../sources/osti/overview.md)
