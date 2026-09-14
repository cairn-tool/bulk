# ITU-R Recommendations — access research

What was established, by making the requests rather than reading about them, before the `itu-r` plugin was written. Ported from the research note `access-notes.md` in the original notes; every request below was actually made.

Both ITU sectors were researched in session
[20260913-001](../../guide/fetching.md) (2026-09-13): ITU-T
1,129 of 1,260 texts fetched, ITU-R 94 of 94. This note records what that
session established and what `bulk itu-t fetch` and `itu-r` rely on.

## ITU-R

| Question      | Answer                                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue     | No API. `https://www.itu.int/rec/R-REC-<series>/en` lists a series' Recommendations (links with `parent=R-REC-M.1036`); `https://www.itu.int/rec/R-REC-<rec>/en` lists every edition with its id (`R-REC-M.1036-8-202602-I`), date, title, status. Pages are cp1252 |
| File          | `https://www.itu.int/dms_pubrec/itu-r/rec/<series lower>/<edition id>!!PDF-E.pdf` — a plain file, no login endpoint                                                                                                                                                 |
| Failure modes | Occasional connection resets, clean on retry                                                                                                                                                                                                                        |
| Volume        | The six series the collection holds (BO BS BT F M SF) are ~500 Recommendation pages; the crawl is cached, so re-runs refetch nothing                                                                                                                                |

Tested for the commands on 2026-09-13: three D-series texts and one SF
edition pulled, byte-verified as PDF.
