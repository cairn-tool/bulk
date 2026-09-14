import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "nist-techpubs",
  name: "NIST/NBS Technical Series",
  summary:
    "NIST/NBS Technical Series — SP, FIPS, NISTIR, TN, Circulars, Handbooks and the rest, by series, date or title; records by designation",
  hosts: [
    {
      host: "api.github.com",
      userAgent: "browser",
      note: "The catalogue is a monthly release asset of usnistgov/NIST-Tech-Pubs",
    },
    { host: "github.com", userAgent: "browser" },
    { host: "objects.githubusercontent.com", userAgent: "browser" },
    {
      host: "doi.org",
      userAgent: "browser",
      note: "10.6028/<designation> redirects to the PDF on nvlpubs.nist.gov",
    },
    { host: "nvlpubs.nist.gov", userAgent: "browser" },
    {
      host: "api.crossref.org",
      userAgent: "polite",
      note: "Single-designation lookups go to Crossref, which holds every NIST DOI",
    },
  ],
  fetch: {
    description:
      "Pull NIST and NBS technical-series publications into <dest>/<series>/<designation> - <title>.pdf.\n\n" +
      "The catalogue (every record with a public DOI) is taken once from the latest NIST-Tech-Pubs\n" +
      "release and kept under _catalogue/; --refresh-catalogue takes it again. Selection then happens\n" +
      "locally: --series (SP, FIPS, IR, TN, CIRC …), --id for named designations, --query for title\n" +
      "words, --author, --subject and a --from/--until year window. Several selectors narrow together.\n\n" +
      "Files come from doi.org, which redirects to nvlpubs.nist.gov. The selection is saved as\n" +
      "_records.json and _records.tsv, the files in _manifest.tsv.",
    examples: [
      'bulk nist-techpubs fetch --id "NIST SP 800-53r5" --id NIST.FIPS.140-3 --dest ~/archive/nist',
      "bulk nist-techpubs fetch --series SP --from 2015 --limit 50",
      "bulk nist-techpubs list --series NBS.CIRC",
      'bulk nist-techpubs fetch --query "cryptographic module" --dry-run',
    ],
    options: [
      {
        kind: "string",
        name: "id",
        value: "desig",
        description:
          'A designation, DOI or doi.org URL ("NIST SP 800-53r5", NIST.FIPS.140-3); repeatable',
        repeatable: true,
      },
      {
        kind: "string",
        name: "series",
        value: "code",
        description:
          "A series: SP, FIPS, IR, TN, CIRC, HB … or qualified (NIST.SP, NBS.CIRC); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "query",
        value: "words",
        description: "Every word must appear in the title",
      },
      {
        kind: "string",
        name: "author",
        value: "name",
        description: "A personal or corporate author",
      },
      {
        kind: "string",
        name: "subject",
        value: "words",
        description: "Words in the subject headings",
      },
      { kind: "string", name: "doi", value: "doi", description: "The exact DOI" },
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
        name: "refresh-catalogue",
        description: "Take the catalogue again even if it is here",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "designation",
      "series",
      "title",
      "authors",
      "date",
      "doi",
      "corporate",
      "genre",
      "subjects",
    ],
    listColumns: [{ key: "designation", width: 26 }, { key: "date", width: 6 }, { key: "title" }],
    catalogueFile: "_catalogue/allrecords-MODS.xml",
    selectionRequired: true,
  },
  query: {
    keyLabel: "NIST designation",
    description:
      "Look NIST designations up (Crossref holds every NIST technical-series DOI): title, authors,\n" +
      'date, series, DOI. A designation is written as on the cover ("NIST SP 800-53r5"), dotted\n' +
      "(NIST.FIPS.140-3), or as the 10.6028 DOI; case is kept as written. --resolve follows the DOI\n" +
      "and reports the nvlpubs.nist.gov URL of the PDF.",
    examples: [
      'bulk nist-techpubs query "NIST SP 800-53r5" --resolve',
      "bulk nist-techpubs query NIST.FIPS.140-3 10.6028/NIST.SP.800-207",
      "bulk nist-techpubs query --from designations.txt --cache nist.json --tsv nist.tsv",
    ],
    options: [
      {
        kind: "boolean",
        name: "resolve",
        description: "Follow the DOI and report the nvlpubs.nist.gov URL the PDF is at",
      },
    ],
    batchSize: 1,
    columns: [
      { key: "designation", width: 26 },
      { key: "series", width: 10 },
      {
        key: "title",
        value: (_k, r) =>
          `${String(r.title ?? "").replace(/[: ]+$/, "")}${r.subtitle ? `: ${String(r.subtitle)}` : ""}`,
      },
      { key: "authors" },
      { key: "issued", width: 10 },
      { key: "doi", width: 32 },
    ],
  },
};
