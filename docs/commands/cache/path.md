# `cache path`

## Synopsis

```text
bulk cache path [options]
```

Prints the cache directory: `BULK_CACHE`, else `$XDG_CACHE_HOME/bulk`, else `~/.cache/bulk`. It
holds the challenge cookie jars, the per-plugin query caches configured with `cache: true`, the
per-run session jars, and the update-check cache — everything that is safe to delete.

## Options

The [common options](../common.md#options-on-every-command) only.

## Exit codes

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Path written.     |
| `1`  | Invocation error. |
