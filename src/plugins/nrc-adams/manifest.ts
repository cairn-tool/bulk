import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "nrc-adams",
  name: "NRC ADAMS public library",
  summary:
    "NRC ADAMS public library — documents by accession number, docket, type, date range or free text (APS search API)",
  hosts: [
    {
      host: "adams-search.nrc.gov",
      userAgent: "browser",
      note: "The JSON search API behind ADAMS Public Search; anonymous",
    },
    {
      host: "www.nrc.gov",
      userAgent: "curl",
      note: "The document files; Akamai denies a browser User-Agent sent from a script and serves curl's own",
    },
  ],
  fetch: {
    description:
      "Pull NRC documents into <dest>/<year added>/<accession number> - <title>.pdf.\n\n" +
      "Select by accession numbers (--ml, or --ml-from FILE), or by a search: --q free text (Lucene\n" +
      'syntax works: DocumentType:"NUREG"), --docket, --type, --added / --dated ranges — any\n' +
      "combination; the search is paged 1,000 at a time and saved raw as _adams-search.json. Each\n" +
      "document's Url comes from the record; DocumentSize is not the served byte count, so files are\n" +
      "verified by magic. Packages (IsPackage) have no file of their own; --packages pulls their\n" +
      "member documents.",
    examples: [
      "bulk nrc-adams fetch --ml ML11126A118 --ml ML26237A144 --packages --dest ~/archive/nrc",
      'bulk nrc-adams list --docket 05200001 --type "Design Control Document (DCD)"',
      "bulk nrc-adams fetch --added 2026-09-01 2026-09-07 --dry-run",
      'bulk nrc-adams fetch --q "molten salt reactor" --dated 2024-01-01 2026-12-31 --limit 50',
    ],
    options: [
      {
        kind: "string",
        name: "ml",
        value: "MLxxxxxxxxx",
        description: "Accession number; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "ml-from",
        value: "file",
        description: "Accession numbers from a file, one per line",
        complete: "file",
      },
      { kind: "string", name: "q", value: "text", description: "Free-text query" },
      {
        kind: "string",
        name: "docket",
        value: "n",
        description: "Docket number (05000255); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "type",
        value: "type",
        description: "Document type (Inspection Report, NUREG, …); repeatable",
        repeatable: true,
      },
      {
        kind: "tuple",
        name: "added",
        values: ["from", "to"],
        description: "Date added to ADAMS, YYYY-MM-DD YYYY-MM-DD",
      },
      {
        kind: "tuple",
        name: "dated",
        values: ["from", "to"],
        description: "Document date, YYYY-MM-DD YYYY-MM-DD",
      },
      {
        kind: "boolean",
        name: "packages",
        description: "Also pull the member documents of every package in the selection",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "accession",
      "title",
      "document_date",
      "date_added",
      "type",
      "docket",
      "author",
      "affiliation",
      "listed_bytes",
      "pages",
      "is_package",
      "package",
    ],
    listColumns: [
      { key: "accession", width: 13 },
      { key: "document_date", width: 11 },
      { key: "listed_bytes", align: "right", width: 10 },
      { key: "type", width: 28 },
      { key: "title" },
    ],
    catalogueFile: "_adams-search.json",
    selectionRequired: true,
  },
};
