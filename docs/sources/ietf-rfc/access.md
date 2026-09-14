# The RFC series — access research

What was established, by making the requests rather than reading about them, before the `ietf-rfc` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

The RFC series was researched in session
[20260913-001](../../guide/fetching.md) (2026-09-13), which
fetched 668 of 668 RFCs the collection lacked. This note records what that
session established and what `bulk ietf-rfc fetch` relies on; nothing was
re-probed for the command beyond the tests in
[../scripts/_index.md](../../commands.md).

| Question          | Answer                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue         | `https://www.rfc-editor.org/rfc-index.xml` — every RFC (9,836 published as of 2026-09-13, last RFC 10042, 188 not-issued numbers) with title, date, status, formats, obsoletes/updates. One GET, ~7 MB                              |
| File              | `https://www.rfc-editor.org/rfc/rfc<n>.pdf`, the RFC Editor's own rendering — present for every RFC published since 2019 and most earlier ones. Fallbacks: `rfc/pdfrfc/rfc<n>.txt.pdf` (the text set in PDF), then `rfc/rfc<n>.txt` |
| Mechanism         | Plain files; no login, no challenge, no rate limit met at 2 s pacing; browser UA fine                                                                                                                                               |
| Failure modes     | A missing rendering is a clean 404. Five RFCs (219, 515, 571, 587, 4373) have no PDF rendering at all — the text is the only form                                                                                                   |
| Mutability        | RFCs are immutable once published; the index grows. A re-pull is `--from <last number + 1>` or `--missing-from <folder>`                                                                                                            |
| `robots.txt`      | `rfc-editor.org/robots.txt` disallows nothing under `/rfc/`                                                                                                                                                                         |
| The archive holds | 9,341 RFCs through RFC 9371 in `Standards/IETF/RFC N000-N999/RFC <n> - <title>.pdf`; the session's 668 were filed on 2026-09-13                                                                                                     |

Requests made for this note: none beyond the session's; the command was
tested on RFC 219 (text fallback) and RFC 10042 (PDF) on 2026-09-13.
