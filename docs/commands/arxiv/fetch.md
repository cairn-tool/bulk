# `arxiv fetch`

## Synopsis

```text
bulk arxiv fetch [options]
```

Pull arXiv papers into <dest>/<primary category>/<arXiv id> - <title>.pdf.

Select with --id, or a search: --query (the arXiv search_query syntax), --category, --author,
--title, combined with AND. The Atom feed of each page is kept under _feed/, the papers in
_papers.tsv and _manifest.tsv. --source takes the submitted e-print archive (/e-print/)
instead of the PDF, --with-source takes both.

arXiv asks for one API request every three seconds; that pacing is applied automatically, so
a large --limit simply takes its time (100 papers a page).

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.arxiv.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_feed/page1.xml`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

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

Under the destination: `_feed/page1.xml` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `arxiv_id`, `version`, `title`, `authors`, `primary_category`, `categories`, `published`, `updated`, `doi`, `journal_ref`, `comment`, `kind`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk arxiv fetch --id 1706.03762 --id cs/9901002 --dest ~/archive/arxiv
bulk arxiv fetch --category cs.AR --limit 20
bulk arxiv fetch --query 'cat:cs.AR AND abs:"cache coherence"' --limit 50 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`arxiv list`](list.md) — the catalogue, without downloading.
- [arXiv e-prints](../../sources/arxiv/overview.md) — what the source publishes.
- [Access research](../../sources/arxiv/access.md) — how the source is reached, and what fails.
