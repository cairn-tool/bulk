# USDA Forest Service Treesearch

## Purpose

Treesearch is the Forest Service's online collection of its research publications — General Technical Reports, Research Papers, Resource Bulletins, station proceedings and the journal articles its scientists author — most with the full text free. It is a Drupal site with no API, but three plain GETs are all it takes, and `usda-treesearch` pulls publications by search, id or the whole sitemap.

## Scope

Publications selected by `--query` (the site's own search box, 10 a page, full publications only unless `--all-publications`), `--id`, or `--all` (the 15-page sitemap, the whole collection); each publication's page is read for its fields, so a run makes one request per publication before the transfer, and `--station`, `--type`, `--from`/`--until` narrow what was found. Only publications whose page offers a PDF are downloaded; the rest stay in the record list.

## Types of data

Publication PDFs (`download/treesearch/<id>.pdf`) named `<id> - <title>.pdf` under the research station, with id, title, authors, year, type, station, source, PDF URL, listed size and keywords in the manifest and every publication read in `_records.json`/`_records.tsv`.

## Commands

| Command                                                                 | Does                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| [`bulk usda-treesearch fetch`](../../commands/usda-treesearch/fetch.md) | pull the selected publications                    |
| [`bulk usda-treesearch list`](../../commands/usda-treesearch/list.md)   | the publications, whether or not they offer a PDF |

## Related

- [Access research](access.md) — how the source is reached, what fails, and every request made.
- [Configuration](../../configuration.md) — the destination and delay for this plugin under `plugins.usda-treesearch`.
- [usda-nal](../usda-nal/overview.md) — the National Agricultural Library catalogue, records only.
