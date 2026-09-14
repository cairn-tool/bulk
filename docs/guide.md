# Guides

Why each part of `bulk` exists, and the facts that make its answers trustworthy. Per-command flags
are not here — those are in the [complete command listing](commands.md) and the pages under
`commands/`.

| Guide                                         | Covers                                                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [Fetching](guide/fetching.md)                 | The pipeline every catalogue pull runs through, why a status code proves nothing, and the host access findings the plugins are built on. |
| [Querying](guide/querying.md)                 | Identifiers in, records out; normalisation, the cache, and what a miss means.                                                            |
| [Rate limiting](guide/rate-limiting.md)       | Pacing from the host's own headers, declared floors, and the one host where a 429 is not a retry.                                        |
| [Bot challenges](guide/bot-challenges.md)     | What solving a proof-of-work gate is and is not, and where the cookie lives.                                                             |
| [Writing a plugin](guide/writing-a-plugin.md) | Adding a data source: the manifest, the engine, the fixtures, the docs.                                                                  |

## Related

- [Data sources](sources.md) — what each source publishes and how it is reached.
- [Standards every command meets](standards.md) — the requirements the guides explain.
