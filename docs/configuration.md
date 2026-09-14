# Configuration

`bulk` reads one file, `~/.config/bulk/config.yml`, and one cache directory, `~/.cache/bulk`.
Nothing else is a fixed path: where fetched files land comes from `--dest`, from the file, or from
`BULK_ARCHIVE`, and a fetch refuses to run without one.

## Locations

| What               | Default                                                              | Override                               |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------- |
| Configuration file | `$XDG_CONFIG_HOME/bulk/config.yml`, else `~/.config/bulk/config.yml` | `BULK_CONFIG`                          |
| Cache directory    | `$XDG_CACHE_HOME/bulk`, else `~/.cache/bulk`                         | `BULK_CACHE`                           |
| Archive root       | none                                                                 | `archive:` in the file, `BULK_ARCHIVE` |

`bulk config path` prints the first, `bulk cache path` the second, `bulk config init` writes a
starter file.

## Complete shape and defaults

```yaml
version: 1

# Root that a relative plugin `dest` resolves under. BULK_ARCHIVE overrides.
archive: /Volumes/Archives

# Contact address sent in the polite User-Agents some APIs reward (Crossref, Open Library,
# NTRS, NIST lookups). BULK_CONTACT overrides. Without one the User-Agent carries the package
# name and homepage, and Crossref serves its public pool.
contact: you@example.com

# Default seconds between downloads.
delay: 2

output:
  format: llm # the default --format: llm, human, json

# Host → base URL rewrites, for mirrors and test servers. The original host still drives the
# pacing, the User-Agent policy and the cookie jar. BULK_HOSTS ("host=url,host=url") overlays.
hosts:
  www.ntsb.gov: http://127.0.0.1:4310

# Per-host minimum seconds between requests, overriding a plugin's declared floor
# (0 lifts arXiv's three seconds — for a test server, not for arXiv).
limits:
  export.arxiv.org: 3

# Per-plugin settings.
plugins:
  ntsb-reports:
    dest: ntsb/reports # relative to `archive`, or absolute
    delay: 0.5 # overrides the top-level delay for this plugin
    options: { mode: [Aviation] } # defaults for the plugin's own options, by camelCase name
  cern-cds:
    dest: /abs/path/cds
  openlibrary:
    cache: true # keep answers in <cache dir>/query/openlibrary.json
  crossref:
    cache: ~/notes/crossref.json # or a path of your own

query:
  delay: 0.5 # default seconds between lookup requests

challenge:
  anubis:
    enabled: true # false refuses to solve the proof of work (CDS files then come from INSPIRE)
    refreshMargin: 600 # re-solve when the cached cookie expires within this many seconds
    delay: 1 # seconds to wait after presenting the proof before checking the cookie
```

Unknown keys are errors, reported before any command runs: a typo in a plugin id or an option
name must not silently send a fetch to the default place.

## Precedence

For every setting, first wins:

1. the command-line flag, when it was typed;
2. the environment (`BULK_ARCHIVE`, `BULK_CONTACT`, `BULK_CACHE`, `BULK_CONFIG`, `BULK_HOSTS`);
3. `plugins.<id>.…` in the file;
4. the top-level setting in the file (`delay`, `output.format`, `query.delay`);
5. the built-in default.

`plugins.<id>.options` sets defaults for a plugin's own options — `mode`, `series`, `noAnubis` —
under their camelCase names; a typed flag still wins.

## Destinations

`bulk <plugin> fetch` needs a destination: `--dest DIR`, or `plugins.<id>.dest`. A relative
configured `dest` needs an archive root (`archive:` or `BULK_ARCHIVE`) to resolve under; without
either the command exits `1` and names the key that would fix it. There is no derived default,
so nothing is ever pulled into a directory that was not named.

## Environment variables

| Variable                            | Meaning                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `BULK_CONFIG`                       | Path of the configuration file.                            |
| `BULK_CACHE`                        | Cache directory.                                           |
| `BULK_ARCHIVE`                      | Archive root that relative destinations resolve under.     |
| `BULK_CONTACT`                      | Contact address sent in polite User-Agents.                |
| `BULK_HOSTS`                        | Host overrides, `host=base-url` pairs separated by commas. |
| `BULK_NO_UPDATE_NOTIFIER`           | Set to `1` to silence the update notice.                   |
| `XDG_CONFIG_HOME`, `XDG_CACHE_HOME` | Bases for the default paths.                               |

`bulk describe` publishes the same list.
