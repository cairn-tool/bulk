import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "ntis-ntrl",
  name: "National Technical Reports Library (NTIS)",
  summary:
    "NTIS National Technical Reports Library — records by search or accession number, with the full text taken from the issuing agency",
  hosts: [
    {
      host: "ntrl.ntis.gov",
      userAgent: "browser",
      note: "A JSF/PrimeFaces application: the catalogue is open, its own download action returns an empty 200",
    },
    { host: "www.osti.gov", userAgent: "polite", note: "The DOE-origin documents NTIS indexes" },
    { host: "apps.dtic.mil", userAgent: "browser", note: "The AD… documents NTIS indexes" },
  ],
  fetch: {
    description:
      "Harvest NTIS records and pull what full text can be had, into <dest>/<NTIS subject category>/.\n\n" +
      "Select with --query (NTRL's own search) or --accession. Every selected record's title-detail\n" +
      "page is read, so the records are complete whether or not a document follows.\n\n" +
      "NTRL's own download action returns an empty body (verified 2026-09-14, in a browser as well),\n" +
      "so by default the document is sought at the issuing agency instead: OSTI for the DOE-origin\n" +
      "accessions, DTIC for AD numbers. --source ntrl tries NTRL first, --source both tries NTRL then\n" +
      "the agency. Records for which no source resolves are listed at the end with their accession\n" +
      "numbers. The records are saved as _records.json and _records.tsv.",
    examples: [
      "bulk ntis-ntrl fetch --accession ORNLTM3177 --accession ORNL5011 --dest ~/archive/ntis",
      'bulk ntis-ntrl fetch --query "molten salt reactor" --limit 25',
      'bulk ntis-ntrl list --query "radar cross section"',
      'bulk ntis-ntrl fetch --query "fluoride volatility" --records-only',
    ],
    options: [
      {
        kind: "string",
        name: "query",
        value: "words",
        description: "NTRL's own search over the whole record",
      },
      {
        kind: "string",
        name: "accession",
        value: "acc",
        description: "An NTIS accession number (ADA130537, PB2021100329, ORNLTM3177); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "source",
        value: "where",
        description: "Where to look for the document (NTRL's own action returns an empty body)",
        choices: ["agency", "ntrl", "both"],
        default: "agency",
      },
      {
        kind: "boolean",
        name: "records-only",
        description: "Harvest the records and look for no documents",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "accession",
      "title",
      "authors",
      "year",
      "pages",
      "source",
      "agency",
      "document_type",
      "categories",
    ],
    listColumns: [
      { key: "accession", width: 16 },
      { key: "year", width: 6 },
      { key: "source", width: 22 },
      { key: "title" },
    ],
    catalogueFile: "_rows.json",
    selectionRequired: true,
  },
  query: {
    keyLabel: "accession number",
    description:
      "Look NTIS accession numbers up in the National Technical Reports Library.\n\n" +
      "Reports title, authors, date, pages, document type, source agency and NTIS subject\n" +
      "categories, and whether NTRL itself offers the document — NTRL's download action returns an\n" +
      'empty body as of 2026-09-14, so "offers" means the link is there, not that it works.\n' +
      "--abstract prints the abstract and keywords too. --search treats each key as search text and\n" +
      "reports the best-matching accession numbers instead of looking one up.",
    examples: [
      "bulk ntis-ntrl query ADA130537 PB2021100329 ORNLTM3177",
      "bulk ntis-ntrl query ORNLTM3177 --abstract",
      'bulk ntis-ntrl query --search "molten salt reactor" --rows 5',
      "bulk ntis-ntrl query --from accessions.txt --cache ntis.json --tsv ntis.tsv",
    ],
    options: [
      {
        kind: "boolean",
        name: "search",
        description: "Treat each key as search text and report the best-matching accession numbers",
      },
      {
        kind: "integer",
        name: "rows",
        value: "n",
        description: "With --search: how many results to show",
        default: 10,
        min: 1,
      },
      {
        kind: "boolean",
        name: "abstract",
        description: "Print the abstract and keywords for each record",
      },
    ],
    batchSize: 1,
    columns: [
      { key: "accession", width: 16 },
      { key: "title" },
      { key: "authors", value: (_k, r) => r.authors || r.corporate },
      { key: "date", width: 10 },
      { key: "pages", align: "right", width: 5 },
      { key: "agency" },
      { key: "ntrl_offers", width: 20 },
    ],
  },
};
