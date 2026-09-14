# Machine-readable result contract

`bulk` is meant to be run by scripts and agents as much as by people. This document is the
contract those consumers can rely on: what each command emits, which stream it lands on, what the
exit code means, and how all of that is allowed to change.

Two commands make the contract self-describing:

```bash
bulk describe --format json              # every command, option, exit code, and schema id
bulk describe ntsb-reports fetch -fj     # one command
bulk schema                              # the published schemas
bulk schema fetch-result                 # one schema document
```

## Contract version

`schemaVersion` (currently `1`) versions the **contract surface**: the envelope shape, the
`describe` payload, the schema id scheme, and the stream guarantees below. It is hand-owned in
`src/contract/version.ts` and unrelated to the package version, which semantic-release manages.
Individual payloads are versioned by the major in their schema id path (`…/schema/v1/<id>.json`).

## Schema ids

| Id                           | Emitted by                   | Payload                                                                                                                                                                                   |
| ---------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch-result`               | `<plugin> fetch`             | `{ plugin, dest, manifest, dryRun, planned, summary, warnings, outcome }` — `outcome` is `{ ok, skip, fail, bytes, interrupted, seconds, logPath, failures[] }`, or `null` for a dry run. |
| `list-result`                | `<plugin> list`              | `{ plugin, count, summary, warnings, rows[] }`.                                                                                                                                           |
| `query-result`               | `<plugin> query`             | `{ plugin, total, found, skipped[], results }` — `results` maps each normalised key to its record, `null` for a miss, or `{ error }`.                                                     |
| `sources`                    | `sources`                    | `{ count, plugins[] }` with each plugin's commands and host policies.                                                                                                                     |
| `cache-list`, `cache-limits` | `cache list`, `cache limits` | The cached cookies; the declared floors and the limits learned.                                                                                                                           |
| `config`                     | `config show`                | The resolved configuration.                                                                                                                                                               |
| `check-update`               | `check-update`               | `{ current, latest, updateAvailable }`.                                                                                                                                                   |
| `describe`                   | `describe`                   | The contract itself.                                                                                                                                                                      |

## What is and is not a breaking change

| Change                                                            | Breaking?                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Adding a property to a payload                                    | No — no schema sets `additionalProperties: false`.         |
| Adding a plugin, a command, or an option                          | No.                                                        |
| Adding a value to an enumerated option                            | No.                                                        |
| Removing or renaming a property, command, option, or plugin       | Yes.                                                       |
| Changing an exit code's meaning                                   | Yes.                                                       |
| Changing which stream a payload lands on                          | Yes.                                                       |
| Changing a manifest column or the file layout under a destination | Yes — archives filled by the old layout would re-download. |

Breaking changes are released as a new major (Conventional Commits `feat!:`).

## Exit codes

| Code  | Meaning                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`   | Success: every selected item present and verified; at least one key found; a listing written.                                                                                         |
| `1`   | Invocation, I/O, network, or configuration error. A fetch that failed before pulling anything (no destination, a catalogue that would not parse) exits `1`, and its message says why. |
| `2`   | Actionable findings: one or more items failed (the log says which — re-run to retry), no key was found, or `check-update` found a newer version.                                      |
| `130` | Interrupted with Ctrl-C. A fetch's `.part` file is removed, the log is closed, and re-running the same command resumes.                                                               |

The process never calls `process.exit()` from a command: a `CommandExit` carries the status to the
top-level boundary, so a piped `--format json` write is never truncated.

## Streams

The payload of every command goes to **stdout**. Progress lines, the status bar, notes and
warnings go to **stderr**, and the progress display appears only when stderr is a terminal. Under
`--format json` nothing but the payload is written to stdout, and stderr carries only warnings.

## The update notice never corrupts a parse

The passive update notice prints on stderr only when stderr is a terminal, the format is not JSON,
`CI` is unset and `BULK_NO_UPDATE_NOTIFIER` is unset, and never for `describe`, `schema`,
`completion` or `check-update`. `bulk describe` publishes these conditions under `machineStreams`.

## The result envelope

`--envelope` (with `--format json`) wraps the payload:

```json
{
  "schemaVersion": "1",
  "tool": { "name": "@cairn-tool/bulk", "version": "1.2.3" },
  "command": "ntsb-reports fetch",
  "ok": true,
  "exitCode": 0,
  "schema": "https://github.com/cairn-tool/bulk/schema/v1/fetch-result.json",
  "data": { "…": "the payload" }
}
```

Without `--envelope` the bytes are exactly `JSON.stringify(payload, null, 2)`, which is what keeps
the envelope an additive change. Every `--format json` write goes through one function
(`jsonPayload` in `src/result.ts`), so the envelope reaches every command.

## Published schemas

`bulk schema` prints the index; `bulk schema <id>` a document. Schemas are JSON Schema 2020-12
with an `$id`; they are identifiers, not fetchable URLs. No published schema sets
`additionalProperties: false` or `$ref`s another document, so each compiles alone and an additive
change never breaks a validating consumer. `tests/unit/contract-schemas.test.ts` enforces both;
`tests/e2e/contract.test.ts` validates every command's `-fj` payload against its schema and fails
on any command the registry does not declare.
