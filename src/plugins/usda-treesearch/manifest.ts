import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "usda-treesearch",
  name: "USDA Forest Service Treesearch",
  summary:
    "Forest Service Treesearch — GTRs, Research Papers, station publications and FS-authored articles, by search or id",
  hosts: [
    {
      host: "research.fs.usda.gov",
      userAgent: "browser",
      note: "A Drupal site with no API; three plain GETs are enough. The search view is fixed at 10 a page",
    },
  ],
  fetch: {
    description:
      "Pull USDA Forest Service research publications into <dest>/<station>/<id> - <title>.pdf.\n\n" +
      "Select with --query (the site's own search box), --id for named publications, or --all to\n" +
      "walk the sitemap and take the whole collection. --station, --type and --from/--until narrow\n" +
      "what a search returned. Only publications whose page offers a PDF are downloaded;\n" +
      "--with-citations-only keeps the rest in the record list.\n\n" +
      "Each publication's page is read for its fields, so a run makes one request per publication\n" +
      "before the transfer. The records are saved as _records.json and _records.tsv.",
    examples: [
      "bulk usda-treesearch fetch --id 67890 --dest ~/archive/treesearch",
      'bulk usda-treesearch fetch --query "fire behavior fuel model" --limit 25',
      'bulk usda-treesearch list --query wildfire --station "Rocky Mountain Research Station" --from 2020',
      "bulk usda-treesearch fetch --all --limit 100 --dry-run",
    ],
    options: [
      {
        kind: "string",
        name: "query",
        value: "words",
        description: "The site's own search over title, abstract and keywords",
      },
      {
        kind: "string",
        name: "id",
        value: "n",
        description: "A Treesearch publication id; repeatable",
        repeatable: true,
      },
      {
        kind: "boolean",
        name: "all",
        description: "Every publication, enumerated from the sitemap",
      },
      {
        kind: "string",
        name: "station",
        value: "name",
        description: "Keep only this research station (matched loosely)",
      },
      {
        kind: "string",
        name: "type",
        value: "kind",
        description:
          "Keep only this publication type (Scientific Journal, General Technical Report …)",
      },
      {
        kind: "string",
        name: "from",
        value: "yyyy",
        description: "Published in or after this year",
      },
      {
        kind: "string",
        name: "until",
        value: "yyyy",
        description: "Published in or before this year",
      },
      {
        kind: "boolean",
        name: "with-citations-only",
        description:
          "Keep publications that offer no PDF in the record list (nothing is downloaded for them)",
      },
      {
        kind: "boolean",
        name: "all-publications",
        description: "Search all publications, not only those with full text",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "id",
      "title",
      "authors",
      "year",
      "type",
      "station",
      "source",
      "size_text",
    ],
    listColumns: [
      { key: "id", width: 9 },
      { key: "year", width: 6 },
      { key: "station", width: 28 },
      { key: "title" },
    ],
    catalogueFile: "_ids.json",
    selectionRequired: true,
  },
};
