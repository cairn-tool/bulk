import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "osti",
  name: "OSTI.GOV",
  summary:
    "OSTI.GOV — DOE technical reports, journal articles and conference papers with full text, and records by report designation",
  hosts: [
    {
      host: "www.osti.gov",
      userAgent: "polite",
      note: "The API advertises no rate limit; --delay governs",
    },
  ],
  fetch: {
    description:
      "Pull OSTI.GOV full-text documents into <dest>/<product type>/<report number or OSTI id> - <title>.pdf.\n\n" +
      "Select with any combination of the API's own filters: --query (the general `q`), --identifier\n" +
      "(a report number or contract number), --osti-id, --doi, --author, --title, --subject,\n" +
      "--research-org, --sponsor-org, and the --from/--until date windows (publication date, or entry\n" +
      "date with --by-entry-date). Only records that actually have full text are taken unless\n" +
      "--citations-only-too is given.\n\n" +
      "The result list is saved as _records.json and _records.tsv, the files in _manifest.tsv.",
    examples: [
      "bulk osti fetch --identifier ORNL-TM-2578 --dest ~/archive/osti",
      'bulk osti fetch --research-org "Oak Ridge National Lab" --from 1965 --until 1975 --limit 50',
      'bulk osti list --query "molten salt reactor"',
      'bulk osti fetch --subject "MOLTEN SALT REACTOR EXPERIMENT" --dry-run',
    ],
    options: [
      {
        kind: "string",
        name: "query",
        value: "q",
        description: "The API's general `q` — searches the whole record",
      },
      {
        kind: "string",
        name: "identifier",
        value: "id",
        description: "Report or contract number (ORNL-TM-2578)",
      },
      { kind: "string", name: "osti-id", value: "n", description: "The OSTI identifier" },
      { kind: "string", name: "doi", value: "doi", description: "The DOI" },
      { kind: "string", name: "author", value: "name", description: "Author" },
      { kind: "string", name: "title", value: "words", description: "Words in the title" },
      {
        kind: "string",
        name: "subject",
        value: "words",
        description: "Subject category or keyword",
      },
      {
        kind: "string",
        name: "research-org",
        value: "org",
        description: "Research organisation (Oak Ridge National Lab)",
      },
      { kind: "string", name: "sponsor-org", value: "org", description: "Sponsoring organisation" },
      {
        kind: "string",
        name: "fulltext-search",
        value: "words",
        description: "Search inside the full text",
      },
      {
        kind: "string",
        name: "from",
        value: "date",
        description: "Publication date on or after (YYYY[-MM[-DD]])",
      },
      {
        kind: "string",
        name: "until",
        value: "date",
        description: "Publication date on or before (YYYY[-MM[-DD]])",
      },
      {
        kind: "boolean",
        name: "by-entry-date",
        description: "Apply --from/--until to the entry date instead",
      },
      {
        kind: "boolean",
        name: "citations-only-too",
        description: "Do not restrict to records that have full text",
      },
      {
        kind: "string",
        name: "sort",
        value: "field",
        description: "Sort field (publication_date, entry_date, …)",
      },
      {
        kind: "string",
        name: "order",
        value: "dir",
        description: "Sort order",
        choices: ["asc", "desc"],
        default: "desc",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "osti_id",
      "report_number",
      "title",
      "authors",
      "product_type",
      "publication_date",
      "doi",
      "research_orgs",
      "sponsor_orgs",
      "identifier",
      "country",
      "format",
    ],
    listColumns: [
      { key: "ident", header: "identifier", width: 28 },
      { key: "publication_date", header: "date", width: 10 },
      { key: "has_fulltext", header: "text", width: 4 },
      { key: "title" },
    ],
    catalogueFile: "_records.json",
    selectionRequired: true,
  },
  query: {
    keyLabel: "report designation",
    description:
      "Look report designations up on OSTI.GOV: title, authors, date, OSTI id, DOI.\n\n" +
      "A designation is the report number on the cover (ORNL-TM-2578, WASH-1250); volume and\n" +
      "revision suffixes are rewritten to OSTI's form (-V1 → -VOL.1, REV2 → -REV.2). Several records\n" +
      "can match one designation (volumes, revisions); the first is reported in the table and all of\n" +
      "them in --format json.",
    examples: [
      "bulk osti query ORNL-TM-2578 ORNL-4541 WASH-1250",
      "bulk osti query --from designations.txt --cache osti.json --tsv osti.tsv",
    ],
    options: [],
    batchSize: 1,
    columns: [
      { key: "designation", width: 24 },
      { key: "report_number", width: 24 },
      { key: "title" },
      { key: "date", width: 10 },
      { key: "authors" },
      { key: "osti_id", width: 9 },
      { key: "doi", width: 30 },
      {
        key: "matches",
        align: "right",
        width: 7,
        value: (_k, r) => (r.matches as unknown[])?.length ?? 0,
      },
    ],
  },
};
