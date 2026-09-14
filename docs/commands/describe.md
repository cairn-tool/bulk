# `describe`

## Synopsis

```text
bulk describe [command...] [options]
```

Describes the CLI contract as a machine document: every visible command with its options,
arguments and sub-commands, and for each the contract the registry declares — formats, default
format, output schema, exit codes and their meanings, the stream the payload lands on, whether the
command writes or talks to the network, and its stability. The environment variables the tool reads
and the update notice's guarantees are published alongside. Naming a command path narrows the
answer to that command and its descendants.

The description is static: the user configuration is deliberately not applied, so a consumer sees
the same answer on every machine.

## Arguments

| Argument     | Required | Description                                |
| ------------ | -------- | ------------------------------------------ |
| `command...` | No       | A command path, e.g. `ntsb-reports fetch`. |

## Options

| Option           | Default | Description                |
| ---------------- | ------- | -------------------------- |
| `--format <fmt>` | `llm`   | `llm`, `human`, or `json`. |
| `-h`, `--help`   | —       | Show help.                 |

## Examples

```bash
bulk describe -fj | jq '.commands[] | select(.network) | .id'
bulk describe osti query
```

## Exit codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| `0`  | Description written.                          |
| `1`  | Unknown command path, or an invocation error. |

## Related

- [Machine-readable result contract](../contract.md)
