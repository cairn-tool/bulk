# Update checks

`bulk` may print a one-line notice on stderr when a newer version is published. The check is
passive: it reads a cached answer at exit and, when the cache is older than a day, spawns a
detached child that refreshes it through `npm view` under a lock file, so concurrent invocations
spawn at most one.

## Why it is silent so often

The notice never lands on a machine-readable stream. It prints only when stderr is a terminal,
the format is not JSON, `CI` is unset, `BULK_NO_UPDATE_NOTIFIER` is unset, and the command is not
`check-update`, `describe`, `schema`, `completion` or the internal refresh. Those guarantees are
published by `bulk describe` under `machineStreams`, so a consumer can read them rather than infer
them.

`bulk check-update` asks the registry explicitly and is never answered from the cache.
