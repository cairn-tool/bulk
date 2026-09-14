# Download log

`<dest>/_download-log.tsv` — one row per transfer, appended, the header written only when the
file is new. A second pass (CAROL's `--reports`) writes `_reports-log.tsv` in the same shape.

| Column           | Meaning                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `when`           | Local time the transfer ended, `YYYY-MM-DDTHH:MM:SS`.                                                                                                                                          |
| `status`         | `ok`, `skip`, or `fail`.                                                                                                                                                                       |
| `dest`           | Destination relative to the root — for a fallback rendering, the fallback's destination.                                                                                                       |
| `bytes_expected` | What the catalogue stated, or `0`.                                                                                                                                                             |
| `bytes_got`      | What arrived.                                                                                                                                                                                  |
| `sha256`         | Of the kept file; empty on failure.                                                                                                                                                            |
| `seconds`        | Wall time of the transfer.                                                                                                                                                                     |
| `http`           | The final HTTP status, `0` when no response arrived.                                                                                                                                           |
| `note`           | Why it failed: `http 404 text/html`, `empty body (application/pdf)`, `an HTML page instead of the file (…)`, `wrong magic (…)`, `size N != listed M`, `sha1 mismatch`, or the transport error. |

Every attempt is a row — an item tried through two fallbacks has three — so the log is the
complete history of what the tool did to the source. Present files skipped on a re-run are not
logged; the progress line says `skip (present)`.
