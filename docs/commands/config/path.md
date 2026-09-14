# `config path`

## Synopsis

```text
bulk config path [options]
```

Prints the configuration file path — `BULK_CONFIG`, else `$XDG_CONFIG_HOME/bulk/config.yml`, else
`~/.config/bulk/config.yml` — and whether it exists.

## Options

The [common options](../common.md#options-on-every-command) only.

## Exit codes

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Path written.     |
| `1`  | Invocation error. |
