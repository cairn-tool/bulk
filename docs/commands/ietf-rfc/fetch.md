# `ietf-rfc fetch`

## Synopsis

```text
bulk ietf-rfc fetch [options]
```

Pull RFCs into <dest>/RFC N000-N999/RFC <n> - <title>.pdf.

The catalogue is rfc-index.xml (every RFC with title, date, status and formats), saved as
_rfc-index.xml. Select a --from/--to number range, or --missing-from a folder that already
holds `RFC <n> - …` files. Each RFC is taken as the RFC Editor's own PDF rendering; when that
does not exist the text-as-PDF rendering is tried, then the plain text (as `.txt`).

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ietf-rfc.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_rfc-index.xml`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option                 | Default | Description                                                 |
| ---------------------- | ------- | ----------------------------------------------------------- |
| `--from <n>`           | —       | First RFC number.                                           |
| `--to <n>`             | —       | Last RFC number.                                            |
| `--missing-from <dir>` | —       | Skip numbers a folder already holds as `RFC <n> - …` files. |

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

Under the destination: `_rfc-index.xml` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `number`, `title`, `date`, `status`, `formats`, `fallbacks`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ietf-rfc fetch --from 9000 --to 9010 --dest ~/archive/ietf
bulk ietf-rfc fetch --missing-from ~/archive/Standards/IETF
bulk ietf-rfc fetch --from 9000 --to 9010 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ietf-rfc list`](list.md) — the catalogue, without downloading.
- [The RFC series (RFC Editor)](../../sources/ietf-rfc/overview.md) — what the source publishes.
- [Access research](../../sources/ietf-rfc/access.md) — how the source is reached, and what fails.
