import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "archive-items",
  name: "Internet Archive items",
  summary:
    "Internet Archive items — files of the items matching a query, collection or identifier, sha1-verified; item records by identifier",
  hosts: [
    {
      host: "archive.org",
      userAgent: "browser",
      note: "Search, metadata and download are anonymous; downloads redirect to an ia######.us.archive.org node",
    },
  ],
  fetch: {
    description:
      "Pull Internet Archive item files into <dest>/<collection or query>/<identifier>/<file>.\n\n" +
      "Select with --query (the IA search syntax), --collection, or --identifier. The item list is\n" +
      "saved as _items.tsv and the file list as _manifest.tsv; each item's metadata goes in\n" +
      "_metadata/<identifier>.json. By default the original documents are taken and IA's own\n" +
      "derivatives (thumbnails, torrents, OCR indexes, logs) skipped; --file-format and --suffix narrow\n" +
      "further, --originals-only takes only source: original files, and --all-files takes everything\n" +
      "the item holds.\n\n" +
      "Files are verified against the metadata's byte count and sha1 as they stream; a mismatch is\n" +
      "removed and counted as a failure.",
    examples: [
      "bulk archive-items fetch --identifier nasa_techdoc_19730060780 --dest ~/archive/ia",
      "bulk archive-items fetch --collection nasa_techdocs --suffix .pdf --limit 50",
      "bulk archive-items fetch --query 'collection:nasa_techdocs AND year:1969' --suffix .pdf --dry-run",
      "bulk archive-items list --collection nasa_techdocs",
    ],
    options: [
      {
        kind: "string",
        name: "query",
        value: "q",
        description: "Internet Archive search query (collection:… AND year:…)",
      },
      {
        kind: "string",
        name: "collection",
        value: "name",
        description: "Items of this collection; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "identifier",
        value: "id",
        description: "This item; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "file-format",
        value: "fmt",
        description: "Only files of this IA format (Text PDF, DjVuTXT, EPUB…); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "suffix",
        value: "ext",
        description: "Only files ending with this (.pdf); repeatable",
        repeatable: true,
      },
      {
        kind: "boolean",
        name: "originals-only",
        description: "Only files IA marks source: original",
      },
      {
        kind: "boolean",
        name: "all-files",
        description: "Take every file, IA's derivatives and metadata included",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "identifier",
      "file",
      "format",
      "bytes",
      "sha1",
      "md5",
      "source",
      "title",
      "creator",
      "date",
      "mediatype",
      "collection",
    ],
    listColumns: [
      { key: "identifier", width: 34 },
      { key: "format", width: 18 },
      { key: "bytes", align: "right", width: 12 },
      { key: "file" },
    ],
    catalogueFile: "_items.json",
    selectionRequired: true,
  },
  query: {
    keyLabel: "identifier",
    description:
      "Look Internet Archive identifiers up and print title, creator, date, mediatype, collections,\n" +
      "file count and size.\n\n" +
      "With --search each key is an IA search query instead and the matching identifiers are reported\n" +
      "(with --rows to cap them). With --files the item's files are listed — name, format, size, sha1 —\n" +
      "under the one-line record.",
    examples: [
      "bulk archive-items query nasa_techdoc_19730060780",
      "bulk archive-items query nasa_techdoc_19730060780 --files",
      "bulk archive-items query --search 'collection:nasa_techdocs AND year:1969' --rows 10",
      "bulk archive-items query --from identifiers.txt --cache ia.json --tsv items.tsv",
    ],
    options: [
      {
        kind: "boolean",
        name: "search",
        description: "Treat each key as an IA search query and report the matching identifiers",
      },
      {
        kind: "integer",
        name: "rows",
        value: "n",
        description: "With --search: how many identifiers to report",
        default: 50,
        min: 1,
      },
      {
        kind: "boolean",
        name: "files",
        description: "List each item's files under the one-line record",
      },
    ],
    batchSize: 1,
    columns: [
      { key: "identifier", width: 40 },
      { key: "title" },
      { key: "creator" },
      { key: "date", width: 10 },
      { key: "mediatype", width: 9 },
      { key: "collection" },
      { key: "files", align: "right", width: 5 },
      { key: "size", align: "right", width: 9 },
    ],
  },
};
