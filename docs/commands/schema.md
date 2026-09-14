# `schema`

## Synopsis

```text
bulk schema [id] [options]
```

Prints a published output schema, or lists the available schemas. A schema is itself a JSON
document, so it is written verbatim regardless of `--format`; the flag affects only the index.

## Arguments

| Argument | Required | Description                                                         |
| -------- | -------- | ------------------------------------------------------------------- |
| `id`     | No       | A schema id, e.g. `fetch-result`. Without one the index is printed. |

## Options

| Option           | Default | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| `--format <fmt>` | `llm`   | For the index: `llm`, `human`, or `json`. |
| `-h`, `--help`   | —       | Show help.                                |

## Exit codes

| Code | Meaning                  |
| ---- | ------------------------ |
| `0`  | Schema or index written. |
| `1`  | Unknown schema id.       |

## Related

- [Machine-readable result contract](../contract.md#published-schemas)
