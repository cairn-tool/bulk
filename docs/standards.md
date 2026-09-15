# Standards every command meets

What every plugin command must do, and what every plugin must contain. Ported from the standards
the original tool was written to, with the file layout replaced by the plugin layout.

## The `bulk` command

| Feature                 | What it means                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Help at every level** | `bulk --help`, `bulk <plugin> --help`, `bulk <plugin> <command> --help` — each with a description, the options, examples and the exit codes; `bulk sources` prints every plugin with its commands, and `bulk <plugin> --docs` prints a source's full documentation. |
| **`--version`**         | The package version, managed by semantic-release.                                                                                                                                                                                                                   |
| **Exit codes**          | `0` nothing failed · `1` usage, configuration or catalogue error · `2` something failed (the log or the output says what) · `130` interrupted with Ctrl-C.                                                                                                          |
| **Errors**              | Usage errors and interruptions go to stderr; a command never prints a stack trace for an expected failure (a blocked host, a bad file, an empty body) — it records the failure and continues.                                                                       |
| **Machine output**      | `--format json` on every command, through one write path, with a published schema; progress never lands on stdout.                                                                                                                                                  |

## What every command does

| Requirement      | What it means                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Progress**     | One line per item: `[n/total] pct%  <item>` as the item starts, live figures on the right while it runs (a fetch's percentage, bytes so far and seconds), and the outcome — `ok …`, `skip …`, `FAIL …` — flush against the right margin when it ends. On a terminal the line is rewritten at the terminal's width; off a terminal each line is padded to 120 columns with no live rewrites. A download run also pins a reverse-video status line to the bottom row — elapsed time, ok / skip / fail counts, bytes, average speed — restored on exit, Ctrl-C included. |
| **Resume**       | Re-running the identical command after an interruption or a partial failure finishes the job: a file present at its expected size, a lookup already in the cache — skipped. Ctrl-C leaves nothing half-written.                                                                                                                                                                                                                                                                                                                                                       |
| **Verify**       | Nothing is accepted on the strength of a status code: a fetched file must have the right magic bytes, the right size when the catalogue states one, the right digest when it states one; a lookup must parse.                                                                                                                                                                                                                                                                                                                                                         |
| **Record**       | A manifest before the work and a log after it (fetch); a cache of answers (query) — with enough in each row to redo or audit the item.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Scope**        | `--limit N` everywhere; `--dry-run` that plans and prints without doing; `list` that enumerates without pulling; the option that partitions the work naturally (`--mode`, `--series`, `--collection`).                                                                                                                                                                                                                                                                                                                                                                |
| **Pace**         | Network commands wait `--delay` between requests, defaulting to 2 s for downloads and 0.5 s for lookups unless the research showed the host tolerates more; never parallel against one host. On top of that every request is paced from the host's **own** rate-limit headers, with a declared floor for hosts that publish none, and a 429/503 is retried after the `Retry-After` the host asked for.                                                                                                                                                                |
| **Dependencies** | Node's own `fetch`; no curl, no native modules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Fetch

A fetch is one repeatable pull of one system of one source, and every fetch behaves the same way
because the behaviour lives in the runner (`src/pull/`): the plugin enumerates its source, turns
each row into an item, and the runner does the rest.

| Requirement            | What it means                                                                                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enumerate live**     | Fetch the source's catalogue at the start of every run and save it raw in the destination; never pull from a stale snapshot unless `--list-file` is given deliberately.                                                                                                       |
| **Manifest first**     | Write `_manifest.tsv` — one row per item: destination, source URL, expected bytes, the source's own identifiers, dates, title — before the first download.                                                                                                                    |
| **Verify every file**  | HTTP status, a non-empty body, magic bytes for the type, byte count and digest against the catalogue where it states them. Download to `.part`, rename on success, delete on failure.                                                                                         |
| **Log every transfer** | Append to `_download-log.tsv`: timestamp, status, destination, expected and actual bytes, SHA-256, seconds, HTTP status, note.                                                                                                                                                |
| **Destination**        | `--dest`, or the plugin's configured `dest` — never a derived default.                                                                                                                                                                                                        |
| **Naming**             | `<stable identifier> - <title>.<ext>` with the identifier first so files sort; `/` → `and`, `:` → ` -`, control and zero-width characters dropped, names cut at a word to about 180 characters; collisions resolved with the source's row id in parentheses, never a counter. |
| **`list`**             | Print the catalogue and stop, so a source can be inspected without pulling it.                                                                                                                                                                                                |

A source's access research is written before its first command and kept as it was written. It
must establish, by making the requests rather than reading about them: every entry point and its
mechanism; how the catalogue is enumerated, its paging and caps; the file endpoint's failure
modes, found by sending it wrong input (a 200 with 0 bytes, a 200 that is an error page);
`robots.txt` on every host touched; whether the source is mutable and what field signals a change;
and a "Requests made" table of every URL tried with its result. It lives at
`docs/sources/<plugin>/access.md`.

**Re-pulls never delete**: an item that has left the source is a finding, recorded on the source's
page with the date, and the archive copy kept. New and changed items (by the source's modified
date or byte count) are fetched; the manifest and log show which.

## Query

`bulk <plugin> query <keys…>` turns identifiers into catalogue records: keys from the command line
or `--from FILE`; a cache that makes re-runs free and records a miss as `null`; one progress line
per key; output as a table, `--format json` or `--tsv FILE`; `--delay` between requests. A plugin
supplies the key normalisation (an ISBN-10 becomes an ISBN-13 before anything is sent), the
lookup, and the table columns. Records keep the service's own identifier and URL so the answer can
be checked at the source.

## Bot challenges

Some hosts put a proof-of-work gate in front of their files. A solver says whether a response is
its challenge and turns it into an auth cookie; the cookie is cached per host and sent on every
request to that host until it nears expiry. Solving a proof-of-work is a compute toll paid for the
archive owner's own pull at the pull's pacing — not applied to CAPTCHAs or credential gates,
which stay walls. Adding a gate is a solver subclass and its registry entry.

## Documentation

Every plugin has `docs/sources/<plugin>/overview.md` (purpose, scope, types of data, the commands)
and `access.md` (the research), and a page per sub-command under `docs/commands/<plugin>/`
generated from its manifest. The guard test names whatever is missing.
