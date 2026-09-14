# `archive-items list`

## Synopsis

```text
bulk archive-items list [options]
```

Enumerates the catalogue with the same selection options as [`archive-items fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`identifier`, `format`, `bytes`, `file`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

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
bulk archive-items list --identifier nasa_techdoc_19730060780
bulk archive-items list --collection nasa_techdocs --suffix .pdf --limit 50
bulk archive-items list --query 'collection:nasa_techdocs AND year:1969' --suffix .pdf
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`archive-items fetch`](fetch.md)
- [Internet Archive items](../../sources/archive-items/overview.md)
