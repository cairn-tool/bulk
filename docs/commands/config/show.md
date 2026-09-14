# `config show`

## Synopsis

```text
bulk config show [options]
```

Prints the resolved configuration — the file's settings over the defaults, with the environment
applied — so what a fetch will do is visible before it runs: the archive root, the contact, the
delays, the host overrides and limits, and every plugin block.

## Options

The [common options](../common.md#options-on-every-command) only.

## Exit codes

| Code | Meaning                                                                    |
| ---- | -------------------------------------------------------------------------- |
| `0`  | Configuration written.                                                     |
| `1`  | The file is malformed (the message names the key), or an invocation error. |

## Related

- [Configuration](../../configuration.md)
