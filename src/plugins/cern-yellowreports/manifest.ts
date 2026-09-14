import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "cern-yellowreports",
  name: "CERN Yellow Reports",
  summary:
    "CERN Yellow Reports (e-publishing.cern.ch) — the CERN-yyyy-nnn series as article PDFs; open, no challenge",
  hosts: [
    {
      host: "e-publishing.cern.ch",
      userAgent: "browser",
      note: "An Open Journal Systems instance: OAI-PMH catalogue, galley downloads; no bot challenge, unlike CDS",
    },
  ],
  fetch: {
    description:
      "Pull CERN Yellow Report articles into <dest>/<report number>/<article DOI tail> - <title>.pdf.\n\n" +
      "Catalogue: the OJS OAI-PMH feed (saved page by page under _oai/), every article with its DOI,\n" +
      "the issue's report number (CERN-2015-001), authors, date and galley PDF URL. Files are the\n" +
      "galley downloads, verified as PDF. --from/--until filter by the OAI datestamp; --report takes\n" +
      "one report number (issue).",
    examples: [
      "bulk cern-yellowreports list",
      "bulk cern-yellowreports fetch --report CERN-2015-001 --dest ~/archive/cern/yellow",
      "bulk cern-yellowreports fetch --from 2024-01-01 --dry-run",
    ],
    options: [
      {
        kind: "string",
        name: "report",
        value: "CERN-YYYY-NNN",
        description: "One report number (issue); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "from",
        value: "yyyy-mm-dd",
        description: "OAI datestamp on or after",
      },
      {
        kind: "string",
        name: "until",
        value: "yyyy-mm-dd",
        description: "OAI datestamp on or before",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "report_number",
      "doi",
      "title",
      "authors",
      "date",
      "article",
      "galley",
    ],
    listColumns: [
      { key: "report_number", width: 18 },
      { key: "date", width: 11 },
      { key: "title", width: 64 },
      { key: "authors", width: 40 },
    ],
    catalogueFile: "_oai/page1.xml",
  },
};
