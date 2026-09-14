# `cache list`

## Synopsis

```text
bulk cache list [options]
```

Every cached bot-challenge cookie across every solver: the solver, the host, the cookie's state
(`valid`, `expiring`, `expired`, `none`), its expiry, the jar file and its size. Jars live under
`<cache dir>/<solver>/<host>.jar` in curl's Netscape format.

## Options

The [common options](../common.md#options-on-every-command) only.

## Exit codes

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Listing written.  |
| `1`  | Invocation error. |

## Related

- [Bot challenges](../../guide/bot-challenges.md)
- [Cookie jar format](../../formats/cookie-jar.md)
