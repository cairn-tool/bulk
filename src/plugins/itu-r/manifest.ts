import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "itu-r",
  name: "ITU-R Recommendations",
  summary:
    "ITU-R Recommendations by series, crawled from the series pages; every edition, plain files",
  hosts: [
    {
      host: "www.itu.int",
      userAgent: "browser",
      note: "No API: the series and recommendation pages are crawled (they are Windows-1252) and cached under _pages/",
    },
  ],
  fetch: {
    description:
      "Pull ITU-R Recommendations into <dest>/<XX>-Series - <name>/ITU-R <rec>-<n> (<yyyy-mm>) - <title>.pdf.\n\n" +
      "There is no API: the series page (rec/R-REC-<XX>/en) lists the Recommendations and each\n" +
      "Recommendation's page lists every edition with its id, date, title and status. Pages are\n" +
      "cached under _pages/, so a re-run refetches nothing it has; the editions are written to\n" +
      "_editions.tsv, and the files come from dms_pubrec/itu-r/rec/<series>/<edition>!!PDF-E.pdf\n" +
      "for the editions selected by --since and --status.",
    examples: [
      "bulk itu-r fetch --series M --since 2023-01 --dest ~/archive/itu-r",
      "bulk itu-r fetch --since 2026-01 --dry-run                # every held series",
      "bulk itu-r list --series BT --status in-force",
    ],
    options: [
      {
        kind: "string",
        name: "series",
        value: "xx",
        description:
          "Series (BO, BS, BT, F, M, SF, P, S, SM, …); repeatable; default the six BO BS BT F M SF",
        repeatable: true,
      },
      {
        kind: "string",
        name: "since",
        value: "yyyy-mm",
        description: "Editions dated on or after",
      },
      {
        kind: "string",
        name: "status",
        value: "which",
        description: "Edition status",
        choices: ["in-force", "superseded", "all"],
        default: "all",
      },
    ],
    manifestColumns: ["dest", "url", "series", "rec", "edition_id", "date", "title", "status"],
    listColumns: [
      { key: "edition_id", width: 30 },
      { key: "date", width: 6 },
      { key: "status", width: 18 },
      { key: "title" },
    ],
    catalogueFile: "_editions.json",
  },
};
