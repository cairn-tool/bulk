import type { PluginManifest } from "../../plugin/types.js";

export const COLLECTIONS: Record<string, string> = {
  "1": "NEPA",
  "3": "CRCP",
  "4": "OER",
  "5": "NMFS",
  "6": "NWS",
  "7": "OAR",
  "8": "NOS",
  "9": "NESDIS",
  "11": "Sea Grant",
  "12": "Education and Outreach",
  "10031": "NOAA General Documents",
  "11879": "NOAA International Agreements",
  "16402": "OMAO",
  "22022": "IEA",
  "23649": "Cooperative Institutes",
  "24914": "Cooperative Science Centers",
  "23702": "Weather Research and Forecasting Innovation Act",
  "44280": "Deepwater Horizon",
};

export const manifest: PluginManifest = {
  id: "noaa-ir",
  name: "NOAA Institutional Repository",
  summary:
    "NOAA Institutional Repository — journal articles, technical memoranda and reports, by collection (JSON API, sha256-verified)",
  hosts: [
    {
      host: "repository.library.noaa.gov",
      userAgent: "curl",
      note: "Akamai denies a browser User-Agent sent from a script and serves curl's own; the export API answers 406 to Accept: application/json, so */* is sent",
    },
  ],
  fetch: {
    description:
      "Pull a NOAA IR collection into <dest>/<Collection>/<year>/<PID number> - <title>.pdf.\n\n" +
      "Catalogue: the JSON API, one call per collection (saved as _noaa-<pid>.json); each item carries\n" +
      "the file's byte count and sha256, both verified as the file streams. Items shared between\n" +
      "collections are pulled once. --from/--until filter by the date the item was added (the API's\n" +
      "own filter), --type by resource type (Journal Article, Technical Memorandum, …).\n\n" +
      "Collections: " +
      Object.entries(COLLECTIONS)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") +
      ".",
    examples: [
      "bulk noaa-ir list --collection 6                                  # NWS: what is there",
      'bulk noaa-ir fetch --collection 6 --type "Technical Memorandum" --dest ~/archive/noaa',
      "bulk noaa-ir fetch --collection 9 --from 2025-01-01 --dry-run    # NESDIS, added this year",
      "bulk noaa-ir fetch --collection 6 --collection 7 --limit 50",
    ],
    options: [
      {
        kind: "string",
        name: "collection",
        value: "pid",
        description:
          "Collection id (1 NEPA, 3 CRCP, 4 OER, 5 NMFS, 6 NWS, 7 OAR, 8 NOS, 9 NESDIS, …); repeatable",
        repeatable: true,
        required: true,
      },
      {
        kind: "string",
        name: "type",
        value: "type",
        description: "Resource type (Journal Article, Technical Memorandum, Report, …); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "from",
        value: "yyyy-mm-dd",
        description: "Items added to the repository on or after",
      },
      {
        kind: "string",
        name: "until",
        value: "yyyy-mm-dd",
        description: "Items added on or before",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "pid",
      "collection",
      "title",
      "year",
      "type",
      "corp",
      "added",
      "bytes",
      "sha256",
      "file_label",
      "doi",
    ],
    listColumns: [
      { key: "pid", width: 12 },
      { key: "year", width: 7 },
      { key: "type", width: 22 },
      { key: "bytes", align: "right", width: 10 },
      { key: "title" },
    ],
    catalogueFile: "_noaa-<pid>.json",
    selectionRequired: true,
  },
};
