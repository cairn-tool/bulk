# Manifest

`<dest>/_manifest.tsv` — one row per item a fetch planned, written before the first download.

The columns are the plugin's `manifestColumns`; `dest`, `url` and `bytes` are always present and
always filled from the item (destination relative to the root, source URL, expected bytes or `0`
when the catalogue states none), and the rest are the source's own fields: identifiers, dates,
title, whatever is needed to redo or audit the item. Each plugin's `fetch` page lists its columns.

The manifest holds the whole enumerated catalogue where the plugin enumerates more than it
selects (`ntsb-reports` writes every report and pulls the selected modes), so one manifest serves
as the inventory of the source at the time of the run. A re-run rewrites it; the previous one is
not kept, because the log is the durable record.

Cells are one line (tabs and newlines become a space). Rows are in the plugin's stable order.
