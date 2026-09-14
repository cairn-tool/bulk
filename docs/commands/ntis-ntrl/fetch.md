# `ntis-ntrl fetch`

## Synopsis

```text
bulk ntis-ntrl fetch [options]
```

Harvest NTIS records and pull what full text can be had, into <dest>/<NTIS subject category>/.

Select with --query (NTRL's own search) or --accession. Every selected record's title-detail
page is read, so the records are complete whether or not a document follows.

NTRL's own download action returns an empty body (verified 2026-09-14, in a browser as well),
so by default the document is sought at the issuing agency instead: OSTI for the DOE-origin
accessions, DTIC for AD numbers. --source ntrl tries NTRL first, --source both tries NTRL then
the agency. Records for which no source resolves are listed at the end with their accession
numbers. The records are saved as _records.json and _records.tsv.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ntis-ntrl.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_rows.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option              | Default  | Description                                                                                                |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `--query <words>`   | —        | NTRL's own search over the whole record.                                                                   |
| `--accession <acc>` | —        | An NTIS accession number (ADA130537, PB2021100329, ORNLTM3177); repeatable.                                |
| `--source <where>`  | `agency` | Where to look for the document (NTRL's own action returns an empty body). One of `agency`, `ntrl`, `both`. |
| `--records-only`    | `false`  | Harvest the records and look for no documents.                                                             |

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

Under the destination: `_rows.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `accession`, `title`, `authors`, `year`, `pages`, `source`, `agency`, `document_type`, `categories`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntis-ntrl fetch --accession ORNLTM3177 --accession ORNL5011 --dest ~/archive/ntis
bulk ntis-ntrl fetch --query "molten salt reactor" --limit 25
bulk ntis-ntrl fetch --query "fluoride volatility" --records-only
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ntis-ntrl list`](list.md) — the catalogue, without downloading.
- [National Technical Reports Library (NTIS)](../../sources/ntis-ntrl/overview.md) — what the source publishes.
- [Access research](../../sources/ntis-ntrl/access.md) — how the source is reached, and what fails.
