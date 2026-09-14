import type { PluginManifest } from "../../plugin/types.js";

export const MODES = ["Aviation", "Marine", "Highway", "Railroad", "Pipeline", "Hazmat"] as const;

export const manifest: PluginManifest = {
  id: "ntsb-reports",
  name: "NTSB investigation reports library",
  summary:
    "NTSB investigation reports — every adopted report and brief, ~2,000 PDFs, 4.5 GB, filed by mode",
  hosts: [{ host: "www.ntsb.gov", userAgent: "browser" }],
  fetch: {
    description:
      "Pull every NTSB investigation report PDF into <dest>/<Mode>/<file stem> - <Title>.pdf.\n\n" +
      "Source: www.ntsb.gov/investigations/AccidentReports/_api/web/Lists/Reports/items (SharePoint\n" +
      "REST, anonymous). Enumerates the list live and saves it as _reports-list.json, writes\n" +
      "_manifest.tsv, verifies each file (HTTP 200, %PDF- magic, byte count against the list), logs\n" +
      "every transfer with its SHA-256 to _download-log.tsv, and skips files already present at their\n" +
      "listed size, so re-running the same command resumes or retries.",
    examples: [
      "bulk ntsb-reports fetch --dest ~/archive/ntsb/reports",
      "bulk ntsb-reports fetch --mode Aviation --mode Marine",
      "bulk ntsb-reports fetch --dry-run --limit 20",
      "bulk ntsb-reports list --mode Pipeline",
      "bulk ntsb-reports fetch --delay 0.5",
    ],
    options: [
      {
        kind: "string",
        name: "mode",
        value: "MODE",
        description: "Only this mode, repeatable",
        choices: MODES,
        repeatable: true,
      },
    ],
    manifestColumns: [
      "mode",
      "dest",
      "url",
      "bytes",
      "stem",
      "report_number",
      "modes",
      "accident_id",
      "mkey",
      "adopted",
      "accident_date",
      "title",
      "modified",
      "list_id",
    ],
    listColumns: [
      { key: "stem", width: 16 },
      { key: "mode", width: 9 },
      { key: "adopted", width: 10 },
      { key: "bytes", align: "right", width: 12 },
      { key: "title" },
    ],
    catalogueFile: "_reports-list.json",
  },
};
