# Shared command behavior

Every plugin command — `bulk <plugin> fetch|list|query` — shares the options below and the
guarantees under them. A command page lists only the options particular to it.

## Options on every command

| Option           | Default | Description                                                                               |
| ---------------- | ------- | ----------------------------------------------------------------------------------------- |
| `--format <fmt>` | `llm`   | `llm` (plain text for an agent or a log), `human` (the same with colour), or `json`.      |
| `--envelope`     | `false` | Wrap `--format json` output in the [result envelope](../contract.md#the-result-envelope). |
| `--quiet`        | `false` | No progress lines on stderr. Implied by `--format json`.                                  |
| `-h`, `--help`   | —       | Show help.                                                                                |

`-fh` expands to `--format=human` and `-fj` to `--format=json` before argument parsing. The
configured `output.format` is the default when no flag is given.

## Docs

`bulk <plugin> --docs` prints the source's documentation to stdout, verbatim from this
repository's `docs/` (which ships in the package): the [overview](../sources.md), the access
research, then one page per sub-command, each under a comment naming its path
(`<!-- docs/sources/<id>/overview.md -->`). `bulk --docs` prints the shared pages instead: this
page, the [configuration](../configuration.md), and the fetching, querying, rate-limiting and
bot-challenge [guides](../guide.md). Like `--help`, the flag takes no `--format` — the document
is the output. A plugin named with neither a sub-command nor `--docs` prints its help and exits
`1`, as before.

## Fetch

| Option               | Default | Description                                                                                                                |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--dest <dir>`       | —       | Download root. **Required** unless `plugins.<id>.dest` is configured; a relative configured path resolves under `archive`. |
| `--delay <s>`        | `2`     | Seconds between downloads. `plugins.<id>.delay`, then the top-level `delay`, are the defaults.                             |
| `--limit <n>`        | all     | Stop after N items.                                                                                                        |
| `--list-file <file>` | —       | Use a saved catalogue response instead of fetching it.                                                                     |
| `--dry-run`          | `false` | Build the manifest and print the plan; download nothing.                                                                   |

What every fetch guarantees ([the standards](../standards.md) in full):

- **Enumerate live.** The source's catalogue is fetched at the start of every run and saved raw in
  the destination (the plugin's _catalogue file_); a stale snapshot is used only when `--list-file`
  names it deliberately.
- **Manifest first.** `_manifest.tsv` — one row per item: destination, URL, expected bytes, the
  source's own identifiers, dates, title — is written before the first download.
- **Verify every file.** HTTP 200, a non-empty body, the magic bytes for the type, the byte count
  when the catalogue states one, the digest when the catalogue states one. Downloads go to a `.part`
  file and are renamed on success, deleted on failure. Nothing is accepted on the strength of a
  status code: a 0-byte 200 and an HTML page in place of a PDF are the failures the sources
  actually produce.
- **Log every transfer.** `_download-log.tsv` gets a row per transfer: time, status, destination,
  expected and actual bytes, SHA-256, seconds, HTTP status, note.
- **Resume.** A file present at its expected size (or present and non-empty when the catalogue
  gave none) is skipped, so re-running the identical command after an interruption or a partial
  failure finishes the job. Ctrl-C leaves nothing half-written.
- **Pace.** `--delay` between downloads, and on top of it the host's own rate-limit headers and
  declared floors ([rate limiting](../guide/rate-limiting.md)).
- **Name stably.** `<stable identifier> - <title>.<ext>`, identifier first so files sort; `/` → `and`,
  `:` → ` -`, control and zero-width characters dropped, names cut at a word around 180
  characters; collisions resolved with the source's row id in parentheses, never a counter.
- **Never delete.** A re-pull fetches new and changed items; an item that has left the source is
  reported, and the archive copy kept.

Progress — `[n/total] pct%  <item>` with live transfer figures and the outcome on the right margin,
and a reverse-video status line on the terminal's last row — goes to stderr, and only when stderr is
a terminal; off a terminal each line is padded to 120 columns. Under `--format json` the payload
([`fetch-result`](../contract.md)) is written to stdout after the run.

## List

The same selection options as the plugin's `fetch`, plus:

| Option               | Default   | Description                                          |
| -------------------- | --------- | ---------------------------------------------------- |
| `--delay <s>`        | `2`       | Seconds between catalogue requests.                  |
| `--limit <n>`        | all       | Stop after N rows.                                   |
| `--list-file <file>` | —         | Use a saved catalogue response.                      |
| `--tsv <file>`       | —         | Write the rows to this TSV instead of printing them. |
| `--dest <dir>`       | temporary | Keep the catalogue snapshot in this directory.       |

`list` runs the plugin's enumeration and nothing else; it never writes `_manifest.tsv` or a log.

## Query

| Option           | Default              | Description                                                                             |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `keys...`        | —                    | The identifiers, on the command line.                                                   |
| `--from <file>`  | —                    | Read keys from FILE, one per line; `#` starts a comment.                                |
| `--cache <file>` | `plugins.<id>.cache` | JSON cache of answers. `true` in the configuration means `<cache dir>/query/<id>.json`. |
| `--no-cache`     | `false`              | Neither read nor write a cache.                                                         |
| `--refresh`      | `false`              | Ask again even for keys the cache has.                                                  |
| `--delay <s>`    | `0.5`                | Seconds between requests.                                                               |
| `--tsv <file>`   | —                    | Write the records to this TSV.                                                          |

Keys are normalised by the plugin (an ISBN-10 becomes an ISBN-13 before anything is sent; a
doi.org URL becomes a bare DOI) and invalid ones are reported and skipped. Answers are cached by
normalised key: a miss is cached as `null`, so a re-run costs nothing for a key the service has
already said it does not know; an error is never cached. One progress line per key shows the
outcome; the records follow as a table (cells cut at 60 characters), `--tsv`, or `--format json`
(`{ plugin, total, found, skipped, results }` with the full record per key). Exit `2` when nothing
was found, `1` when there was nothing valid to look up.
