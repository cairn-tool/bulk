# Rate limiting

Every request goes through a per-host limiter: before a request goes out the limiter waits long
enough to stay inside the host's stated budget, and after the response comes back its headers are
read for what the host is asking. A command never hand-tunes a delay to stay inside a published
budget; `--delay` is a floor between downloads, not the mechanism.

## What is learned from the response

| Headers                                                                          | Meaning                                                                                                                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `x-rate-limit-limit` / `x-rate-limit-interval`                                   | Crossref's form: `10` per `1s` → 0.1 s between requests.                                                                                 |
| `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` (and the `x-` forms) | The RFC-style trio; a `remaining` near zero spreads what is left over the window, and zero pauses until the reset.                       |
| `retry-after` on a 429 or 503                                                    | The pause the host asked for — seconds or an HTTP date — before the request is re-sent (twice at most). Without one, 5 s, capped at 300. |

`bulk cache limits` prints what a process has learned; because limits are learned per run, outside
a running command it shows only the declared floors.

## Declared floors

Some hosts publish no headers but state a policy. **arXiv** asks for one API request every three
seconds and enforces it with a long block: a burst earns a 14-byte `Rate exceeded.` 429 with no
`Retry-After`, and in testing the block held for over twenty minutes. The `arxiv` plugin declares
the 3 s floor to the limiter, and treats a 429 from `export.arxiv.org` as fatal — reported with a
message to wait and re-run — rather than something to retry through. An advertised limit never
lowers a declared floor.

`limits:` in the [configuration](../configuration.md) overrides a floor per host — to `0` for a
fixture server in a test, never for the real host.

## The delay between downloads

Independently of the limiter, a fetch waits `--delay` seconds between files (2 by default; the
plugin's or the top-level configured delay otherwise). It is the courtesy pacing the research
established each host tolerates, and the status bar keeps counting through it. Catalogue calls
inside a plugin use the smaller of the delay and a plugin-specific cap (ITU-T's series calls wait
up to 5 s; most wait up to 2 s).
