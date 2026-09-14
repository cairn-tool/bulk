import type { PluginManifest } from "../../plugin/types.js";

export const SCOPES = ["agricola", "pubag", "MyInstitution"] as const;
export const FIELDS = ["any", "title", "creator", "subject", "isbn", "issn"] as const;

export const manifest: PluginManifest = {
  id: "usda-nal",
  name: "USDA National Agricultural Library catalogue",
  summary:
    "USDA National Agricultural Library — AGRICOLA and PubAg records by title, author or identifier",
  hosts: [
    {
      host: "search.nal.usda.gov",
      userAgent: "browser",
      note: "Primo's own public endpoint, key-less; records only — the digitised collections are closed",
    },
  ],
  query: {
    keyLabel: "search text",
    description:
      "Search the National Agricultural Library catalogue and report the best matches.\n\n" +
      "Each key is search text. --field picks the index it is searched in (any, title, creator,\n" +
      "subject, isbn, issn); --scope picks the collection (agricola, pubag, or MyInstitution for\n" +
      "everything). --rows sets how many candidates are considered; the best is reported in the\n" +
      "table and all of them in --format json.\n\n" +
      "Records are bibliographic. `bulk usda-treesearch fetch` is the command that downloads USDA documents.",
    examples: [
      'bulk usda-nal query "soybean rust"',
      'bulk usda-nal query "Bromfield soybean rust" --field creator --rows 3',
      "bulk usda-nal query 9780890540626 --field isbn",
      "bulk usda-nal query --scope pubag --from titles.txt --tsv nal.tsv",
    ],
    options: [
      {
        kind: "string",
        name: "field",
        value: "index",
        description: "The index each key is searched in",
        choices: FIELDS,
        default: "any",
      },
      {
        kind: "string",
        name: "scope",
        value: "scope",
        description: "The collection searched",
        choices: SCOPES,
        default: "MyInstitution",
      },
      {
        kind: "integer",
        name: "rows",
        value: "n",
        description: "Candidates considered per key",
        default: 5,
        min: 1,
      },
    ],
    batchSize: 1,
    columns: [
      { key: "search", width: 40 },
      { key: "title" },
      { key: "creators", value: (_k, r) => (r.creators as string[]).slice(0, 3) },
      { key: "date", width: 10 },
      { key: "type", width: 12 },
      { key: "publisher" },
      { key: "doi", width: 30 },
      { key: "matches", align: "right", width: 7, value: (_k, r) => r.total },
    ],
  },
};
