# `usda-treesearch list`

## Synopsis

```text
bulk usda-treesearch list [options]
```

Enumerates the catalogue with the same selection options as [`usda-treesearch fetch`](fetch.md) and
downloads nothing. The rows are printed as a table (columns
`id`, `year`, `station`, `title`), written to a file with `--tsv`,
or emitted as JSON with `--format json`. The catalogue snapshot lands in a temporary directory unless
`--dest` names where to keep it.

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
bulk usda-treesearch list --id 67890
bulk usda-treesearch list --query "fire behavior fuel model" --limit 25
bulk usda-treesearch list --query wildfire --station "Rocky Mountain Research Station" --from 2020
```

## Exit codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `0`   | Catalogue written.                             |
| `1`   | Invocation, configuration, or catalogue error. |
| `130` | Interrupted.                                   |

## Related

- [`usda-treesearch fetch`](fetch.md)
- [USDA Forest Service Treesearch](../../sources/usda-treesearch/overview.md)
