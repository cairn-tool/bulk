# `archive-items fetch`

## Synopsis

```text
bulk archive-items fetch [options]
```

Pull Internet Archive item files into <dest>/<collection or query>/<identifier>/<file>.

Select with --query (the IA search syntax), --collection, or --identifier. The item list is
saved as _items.tsv and the file list as _manifest.tsv; each item's metadata goes in
_metadata/<identifier>.json. By default the original documents are taken and IA's own
derivatives (thumbnails, torrents, OCR indexes, logs) skipped; --file-format and --suffix narrow
further, --originals-only takes only source: original files, and --all-files takes everything
the item holds.

Files are verified against the metadata's byte count and sha1 as they stream; a mismatch is
removed and counted as a failure.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.archive-items.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_items.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                | Default | Description                                                          |
| --------------------- | ------- | -------------------------------------------------------------------- |
| `--query <q>`         | —       | Internet Archive search query (collection:… AND year:…).             |
| `--collection <name>` | —       | Items of this collection; repeatable.                                |
| `--identifier <id>`   | —       | This item; repeatable.                                               |
| `--file-format <fmt>` | —       | Only files of this IA format (Text PDF, DjVuTXT, EPUB…); repeatable. |
| `--suffix <ext>`      | —       | Only files ending with this (.pdf); repeatable.                      |
| `--originals-only`    | `false` | Only files IA marks source: original.                                |
| `--all-files`         | `false` | Take every file, IA's derivatives and metadata included.             |

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

Under the destination: `_items.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `identifier`, `file`, `format`, `bytes`, `sha1`, `md5`, `source`, `title`, `creator`, `date`, `mediatype`, `collection`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk archive-items fetch --identifier nasa_techdoc_19730060780 --dest ~/archive/ia
bulk archive-items fetch --collection nasa_techdocs --suffix .pdf --limit 50
bulk archive-items fetch --query 'collection:nasa_techdocs AND year:1969' --suffix .pdf --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`archive-items list`](list.md) — the catalogue, without downloading.
- [Internet Archive items](../../sources/archive-items/overview.md) — what the source publishes.
- [Access research](../../sources/archive-items/access.md) — how the source is reached, and what fails.
