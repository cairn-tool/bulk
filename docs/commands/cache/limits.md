# `cache limits`

## Synopsis

```text
bulk cache limits [options]
```

The per-host rate limits in force: the declared floors (hosts that publish no rate-limit headers
but state a policy — arXiv's one request every three seconds — and any `limits:` in the
configuration), and what this process has learned from response headers. Limits are learned per
run, so outside a running command the second part is empty; the command exists to answer "what
will the tool do to this host?" without reading the source.

## Options

| Option           | Default | Description                                         |
| ---------------- | ------- | --------------------------------------------------- |
| `--all`          | `false` | Also list hosts with no limit in force.             |
| `--format <fmt>` | `llm`   | `llm`, `human`, or `json`.                          |
| `--envelope`     | `false` | Wrap `--format json` output in the result envelope. |
| `-h`, `--help`   | —       | Show help.                                          |

## Exit codes

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Listing written.  |
| `1`  | Invocation error. |

## Related

- [Rate limiting](../../guide/rate-limiting.md)
