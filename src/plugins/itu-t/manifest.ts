import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "itu-t",
  name: "ITU-T Recommendations",
  summary:
    "ITU-T Recommendations by series and approval date via the MyWorkspace API; login-free download of the public texts",
  hosts: [
    {
      host: "www.itu.int",
      userAgent: "browser",
      note: "The searchRecs API is unauthenticated; TIES-gated texts answer an HTML page with HTTP 200, which the magic check catches",
    },
  ],
  fetch: {
    description:
      "Pull ITU-T Recommendations into <dest>/<X>-Series - <name>/ITU-T <number> (<yyyy-mm>) [<component>] - <title>.pdf.\n\n" +
      "The catalogue is the MyWorkspace API (mws/api/recommendations/searchRecs), one call per\n" +
      "series with an approval-date window, saved as _itut-api.json. Every text is downloaded\n" +
      "through rec/dologin_pub.asp, which serves the public editions without a login; a prepublished\n" +
      "or TIES-only text answers an HTML page instead of a PDF and is logged as such. --main-only\n" +
      "leaves out amendments, corrigenda, errata and supplements.",
    examples: [
      "bulk itu-t fetch --series G --approved-from 2024-01-01 --dest ~/archive/itu",
      "bulk itu-t fetch --approved-from 2026-01-01 --dry-run          # every held series, this year",
      "bulk itu-t list --series Y --main-only",
    ],
    options: [
      {
        kind: "string",
        name: "series",
        value: "x",
        description:
          "Series letter; repeatable (default: the 14 series D E F G H I J M Q T V X Y Z)",
        repeatable: true,
      },
      {
        kind: "string",
        name: "approved-from",
        value: "yyyy-mm-dd",
        description: "Approval date on or after",
        default: "2023-01-01",
      },
      {
        kind: "string",
        name: "approved-to",
        value: "yyyy-mm-dd",
        description: "Approval date on or before (the API rejects years past ~2030)",
        default: "2030-12-31",
      },
      {
        kind: "boolean",
        name: "main-only",
        description: "Main editions only — no amendments, corrigenda, supplements",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "series",
      "dms_id",
      "rec_name",
      "title",
      "approval_date",
      "status",
      "idrec",
    ],
    listColumns: [
      { key: "dms_id", width: 36 },
      { key: "approval_date", width: 11 },
      { key: "status", width: 12 },
      { key: "rec_name", width: 34 },
      { key: "title" },
    ],
    catalogueFile: "_itut-api.json",
  },
};
