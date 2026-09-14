# `osti fetch`

## Synopsis

```text
bulk osti fetch [options]
```

Pull OSTI.GOV full-text documents into <dest>/<product type>/<report number or OSTI id> - <title>.pdf.

Select with any combination of the API's own filters: --query (the general `q`), --identifier
(a report number or contract number), --osti-id, --doi, --author, --title, --subject,
--research-org, --sponsor-org, and the --from/--until date windows (publication date, or entry
date with --by-entry-date). Only records that actually have full text are taken unless
--citations-only-too is given.

The result list is saved as _records.json and _records.tsv, the files in _manifest.tsv.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.osti.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_records.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

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

Common fetch options:

| Option               | Default | Description                                                      |
| -------------------- | ------- | ---------------------------------------------------------------- |
| `--dest <dir>`       | —       | Download root (required unless plugins.<id>.dest is configured). |
| `--delay <s>`        | —       | Seconds between downloads (default from config, 2).              |
| `--limit <n>`        | —       | Stop after N items (default: all).                               |
| `--list-file <file>` | —       | Use a saved catalogue response instead of fetching it.           |
| `--dry-run`          | `false` | Build the manifest and print the plan; download nothing.         |
| `--format <fmt>`     | `llm`   | `llm`, `human`, or `json`.                                       |
| `--envelope`         | `false` | Wrap `--format json` output in the result envelope.              |
| `--quiet`            | `false` | No progress lines on stderr.                                     |
| `-h`, `--help`       | —       | Show help.                                                       |

## Files written

Under the destination: `_records.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `osti_id`, `report_number`, `title`, `authors`, `product_type`, `publication_date`, `doi`, `research_orgs`, `sponsor_orgs`, `identifier`, `country`, `format`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk osti fetch --identifier ORNL-TM-2578 --dest ~/archive/osti
bulk osti fetch --research-org "Oak Ridge National Lab" --from 1965 --until 1975 --limit 50
bulk osti fetch --subject "MOLTEN SALT REACTOR EXPERIMENT" --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`osti list`](list.md) — the catalogue, without downloading.
- [OSTI.GOV](../../sources/osti/overview.md) — what the source publishes.
- [Access research](../../sources/osti/access.md) — how the source is reached, and what fails.
