# `arxiv list`

## Synopsis

```text
bulk arxiv list [options]
```

Enumerates the catalogue with the same selection options as [`arxiv fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`arxiv_id`, `published`, `category`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

## Options

| Option             | Default         | Description                                                           |
| ------------------ | --------------- | --------------------------------------------------------------------- |
| `--id <id>`        | —               | An arXiv identifier (1706.03762, cs/9901002); repeatable.             |
| `--query <q>`      | —               | arXiv search_query syntax (cat:cs.AR AND abs:"cache coherence").      |
| `--category <cat>` | —               | A category (cs.AR, hep-ex); repeatable, ANDed.                        |
| `--author <name>`  | —               | An author; repeatable.                                                |
| `--title <words>`  | —               | Words in the title; repeatable.                                       |
| `--sort <by>`      | `submittedDate` | Search order. One of `submittedDate`, `lastUpdatedDate`, `relevance`. |
| `--order <dir>`    | `descending`    | Sort direction. One of `descending`, `ascending`.                     |
| `--source`         | `false`         | Take the submitted e-print source instead of the PDF.                 |
| `--with-source`    | `false`         | Take both the PDF and the source.                                     |

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
bulk arxiv list --id 1706.03762 --id cs/9901002
bulk arxiv list --category cs.AR --limit 20
bulk arxiv list --query 'cat:cs.AR AND abs:"cache coherence"' --limit 50
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`arxiv fetch`](fetch.md)
- [arXiv e-prints](../../sources/arxiv/overview.md)
