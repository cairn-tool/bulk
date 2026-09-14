# `cern-cds fetch`

## Synopsis

```text
bulk cern-cds fetch [options]
```

Pull CDS records into <dest>/<set or query>/<report number or record id> - <title>/<file>.

Catalogue: --set <OAI set> with --from/--until datestamps through /oai2d (open), or --query
<Invenio pattern> through /search?of=xm, or --record by id. /search and every file URL are
behind the Anubis proof-of-work challenge; it is solved once and the cookie cached (see
`bulk cache`), so files are pulled straight from CDS. --no-anubis leaves the challenge alone
and takes files from INSPIRE-HEP where INSPIRE holds them. Records are saved as MARCXML in
_records/<id>.xml and listed in _manifest.tsv with their 856 file URLs and sizes.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.cern-cds.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_records/<id>.xml`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                 | Default | Description                                                                                |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `--set <set>`          | —       | OAI-PMH set (cerncds:BOOK, cerncds:REPORT, cerncds:FULLTEXT, cerncds:SCAN, …); repeatable. |
| `--from <yyyy-mm-dd>`  | —       | With --set: records changed on or after.                                                   |
| `--until <yyyy-mm-dd>` | —       | With --set: records changed on or before.                                                  |
| `--query <pattern>`    | —       | Invenio search pattern for /search?of=xm (reportnumber:CERN-2004-003*, author:ellis).      |
| `--record <id>`        | —       | A CDS record id; repeatable.                                                               |
| `--no-anubis`          | `false` | Do not solve the Anubis challenge; take files from INSPIRE instead of CDS.                 |
| `--no-inspire`         | `false` | With --no-anubis: do not fall back to INSPIRE either.                                      |
| `--all-formats`        | `false` | Include the derivative files (icons, PDF/A) CDS lists with ?subformat=.                    |

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

Under the destination: `_records/<id>.xml` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `record`, `report_number`, `title`, `date`, `file`, `bytes`, `source`, `cds_url`, `inspire`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk cern-cds fetch --set cerncds:REPORT --from 2026-06-01 --dry-run
bulk cern-cds fetch --query "reportnumber:CERN-2004-003*" --dest ~/archive/cds     # the documented search API
bulk cern-cds fetch --record 823808 --record 782076                                 # named records
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`cern-cds list`](list.md) — the catalogue, without downloading.
- [CERN Document Server](../../sources/cern-cds/overview.md) — what the source publishes.
- [Access research](../../sources/cern-cds/access.md) — how the source is reached, and what fails.
