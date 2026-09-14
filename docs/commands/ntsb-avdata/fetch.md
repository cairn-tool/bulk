# `ntsb-avdata fetch`

## Synopsis

```text
bulk ntsb-avdata fetch [options]
```

Pull the files listed at data.ntsb.gov/avdata/ into <dest>/<name> (<listed date>).<ext>.

The listing gives each file's date and size; a file is skipped when a copy at that date and
size is already present, and a rebuilt avall.zip (new date, new size) lands beside the
previous one rather than over it — the monthly builds accumulate. Byte ranges are not
honoured by the server, so every download is whole. The NTSB has announced that this
dataset moves to its Enterprise API on 2027-04-05.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.ntsb-avdata.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_avdata-list.html`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

## Options

| Option          | Default | Description                                    |
| --------------- | ------- | ---------------------------------------------- |
| `--only <name>` | —       | Only this listed file (avall.zip); repeatable. |
| `--monthly`     | `false` | Only the upNNMMM.zip monthly deltas.           |

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

Under the destination: `_avdata-list.html` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `name`, `listed_date`, `bytes`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk ntsb-avdata fetch --dest ~/archive/ntsb/avdata        # everything listed
bulk ntsb-avdata fetch --only avall.zip                     # the current full database
bulk ntsb-avdata fetch --monthly                            # the twelve upNNMMM.zip deltas
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`ntsb-avdata list`](list.md) — the catalogue, without downloading.
- [NTSB aviation database dumps](../../sources/ntsb-avdata/overview.md) — what the source publishes.
- [Access research](../../sources/ntsb-avdata/access.md) — how the source is reached, and what fails.
