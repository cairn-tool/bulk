# `config init`

## Synopsis

```text
bulk config init [options]
```

Writes a commented starter configuration file at the configuration path, and never over an
existing one.

## Options

The [common options](../common.md#options-on-every-command) only.

## Exit codes

| Code | Meaning                           |
| ---- | --------------------------------- |
| `0`  | File written, or already present. |
| `1`  | Invocation or I/O error.          |

## Related

- [Configuration](../../configuration.md)
