# www.ntsb.gov fixtures

Hand-written in the shape of the `Reports` SharePoint list (`_api/web/Lists/Reports/items?$expand=File`)
as observed on 2026-09-13: four items, one with no `Mode` (filed by its series prefix), one whose file name
carries a trailing space and is listed with a different byte count — the real list has exactly that pair
(`HAB1808.pdf` and `HAB1808 .pdf`). The PDFs are minimal valid headers; the trailing-space file is served as a
0-byte 200 to exercise the empty-body check.
