# `nist-techpubs fetch`

## Synopsis

```text
bulk nist-techpubs fetch [options]
```

Pull NIST and NBS technical-series publications into <dest>/<series>/<designation> - <title>.pdf.

The catalogue (every record with a public DOI) is taken once from the latest NIST-Tech-Pubs
release and kept under _catalogue/; --refresh-catalogue takes it again. Selection then happens
locally: --series (SP, FIPS, IR, TN, CIRC …), --id for named designations, --query for title
words, --author, --subject and a --from/--until year window. Several selectors narrow together.

Files come from doi.org, which redirects to nvlpubs.nist.gov. The selection is saved as
_records.json and _records.tsv, the files in _manifest.tsv.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.nist-techpubs.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_catalogue/allrecords-MODS.xml`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

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

Under the destination: `_catalogue/allrecords-MODS.xml` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `designation`, `series`, `title`, `authors`, `date`, `doi`, `corporate`, `genre`, `subjects`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk nist-techpubs fetch --id "NIST SP 800-53r5" --id NIST.FIPS.140-3 --dest ~/archive/nist
bulk nist-techpubs fetch --series SP --from 2015 --limit 50
bulk nist-techpubs fetch --query "cryptographic module" --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`nist-techpubs list`](list.md) — the catalogue, without downloading.
- [NIST/NBS Technical Series](../../sources/nist-techpubs/overview.md) — what the source publishes.
- [Access research](../../sources/nist-techpubs/access.md) — how the source is reached, and what fails.
