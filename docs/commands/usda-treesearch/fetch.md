# `usda-treesearch fetch`

## Synopsis

```text
bulk usda-treesearch fetch [options]
```

Pull USDA Forest Service research publications into <dest>/<station>/<id> - <title>.pdf.

Select with --query (the site's own search box), --id for named publications, or --all to
walk the sitemap and take the whole collection. --station, --type and --from/--until narrow
what a search returned. Only publications whose page offers a PDF are downloaded;
--with-citations-only keeps the rest in the record list.

Each publication's page is read for its fields, so a run makes one request per publication
before the transfer. The records are saved as _records.json and _records.tsv.

A fetch refuses to run without a destination: pass `--dest`, or set
`plugins.usda-treesearch.dest` in the [configuration](../../configuration.md). Every fetch
behaves as [the shared fetch behaviour](../common.md#fetch) describes: the catalogue is enumerated live
and saved (`_ids.json`), `_manifest.tsv` is written before the first download, every file is
verified, every transfer is logged to `_download-log.tsv`, and re-running the same command resumes.

This command requires a selection; a whole-catalogue pull is refused.

## Options

| Option                  | Default | Description                                                                              |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `--query <words>`       | —       | The site's own search over title, abstract and keywords.                                 |
| `--id <n>`              | —       | A Treesearch publication id; repeatable.                                                 |
| `--all`                 | `false` | Every publication, enumerated from the sitemap.                                          |
| `--station <name>`      | —       | Keep only this research station (matched loosely).                                       |
| `--type <kind>`         | —       | Keep only this publication type (Scientific Journal, General Technical Report …).        |
| `--from <yyyy>`         | —       | Published in or after this year.                                                         |
| `--until <yyyy>`        | —       | Published in or before this year.                                                        |
| `--with-citations-only` | `false` | Keep publications that offer no PDF in the record list (nothing is downloaded for them). |
| `--all-publications`    | `false` | Search all publications, not only those with full text.                                  |

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

Under the destination: `_ids.json` (the raw catalogue), `_manifest.tsv` with the columns
`dest`, `url`, `id`, `title`, `authors`, `year`, `type`, `station`, `source`, `size_text`, `_download-log.tsv`, and the files themselves.

<!-- notes -->

<!-- /notes -->

## Examples

```bash
bulk usda-treesearch fetch --id 67890 --dest ~/archive/treesearch
bulk usda-treesearch fetch --query "fire behavior fuel model" --limit 25
bulk usda-treesearch fetch --all --limit 100 --dry-run
```

## Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Every selected item is present and verified.                   |
| `1`   | Invocation, configuration, or catalogue error; nothing pulled. |
| `2`   | One or more items failed; the log says which. Re-run to retry. |
| `130` | Interrupted with Ctrl-C; re-run to resume.                     |

## Related

- [`usda-treesearch list`](list.md) — the catalogue, without downloading.
- [USDA Forest Service Treesearch](../../sources/usda-treesearch/overview.md) — what the source publishes.
- [Access research](../../sources/usda-treesearch/access.md) — how the source is reached, and what fails.
