import type { PluginManifest } from "../../plugin/types.js";

export const MODES = [
  "Aviation",
  "Marine",
  "Highway",
  "Rail",
  "Pipeline",
  "Hazmat",
  "Non-Modal",
] as const;

export const manifest: PluginManifest = {
  id: "ntsb-dockets",
  name: "NTSB Docket Management System",
  summary:
    "NTSB accident dockets — every factual report, exhibit, photo and data file of an investigation; 27,000 dockets",
  hosts: [
    {
      host: "data.ntsb.gov",
      userAgent: "browser",
      note: "A Razor Pages form POST with an antiforgery token enumerates every docket; docket pages are server-rendered; docBLOB answers a 0-byte 200 when FileName does not match",
    },
  ],
  fetch: {
    description:
      "Pull NTSB accident dockets into <dest>/<NTSB number> - <description>/[<sub-docket>/]<NNNN> - <title>.<ext>.\n\n" +
      "Enumerates every docket with one search POST (saved as _dockets-list.html and _dockets.tsv),\n" +
      "then for each selected docket fetches its page (kept as _docket.html in the docket's folder, its\n" +
      "header fields — Last Modified, Public Release Date, item counts — as _docket.json, its items as\n" +
      "_items.tsv) and pulls every file through docBLOB, verified by magic bytes and a non-empty body.\n" +
      "Select dockets with --ntsb-number / --project, or a slice with --office, --mode, --since / --until;\n" +
      "nothing is pulled without a selection (27,000 dockets is a crawl, not a command). Re-running\n" +
      "resumes; a docket whose item count fell since the last run is reported, never trimmed.",
    examples: [
      "bulk ntsb-dockets fetch --ntsb-number DCA96MA070 --dest ~/archive/ntsb/dockets    # TWA 800, 3,412 items",
      "bulk ntsb-dockets fetch --ntsb-number DCA96MA068 --pdf-only                        # Delta 1288, PDFs only",
      "bulk ntsb-dockets fetch --office DCA --mode Aviation --since 2015-01-01 --dry-run",
      "bulk ntsb-dockets list --mode Marine --since 2024-01-01",
      "bulk ntsb-dockets list --ntsb-number DCA19MA086                                     # the docket's items, without pulling",
    ],
    options: [
      {
        kind: "string",
        name: "ntsb-number",
        value: "id",
        description: "This docket (DCA96MA070); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "project",
        value: "n",
        description: "This docket by ProjectID; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "office",
        value: "prefix",
        description:
          "Dockets whose NTSB number starts with this office code (DCA, CEN, …); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "mode",
        value: "mode",
        description: "Only this mode; repeatable",
        choices: MODES,
        repeatable: true,
      },
      {
        kind: "string",
        name: "since",
        value: "yyyy-mm-dd",
        description: "Accident date on or after",
      },
      {
        kind: "string",
        name: "until",
        value: "yyyy-mm-dd",
        description: "Accident date on or before",
      },
      {
        kind: "boolean",
        name: "pdf-only",
        description: "Take only the PDF items, not data, media or images",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "docket",
      "sub_docket",
      "item",
      "title",
      "pages",
      "photos",
      "type",
      "blob_id",
      "file_name",
      "redacted",
    ],
    listColumns: [
      { key: "ntsb_number", width: 12 },
      { key: "project_id", align: "right", width: 7 },
      { key: "date", width: 10 },
      { key: "type", width: 24 },
      { key: "city_state", width: 28 },
      { key: "description" },
    ],
    catalogueFile: "_dockets-list.html",
    selectionRequired: true,
    notes: [
      "`list` with --ntsb-number/--project lists the docket's items (item, pages, type, destination) rather than dockets.",
    ],
  },
};
