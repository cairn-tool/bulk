import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "crossref",
  name: "Crossref",
  summary:
    "Crossref — the record for a DOI (title, authors, journal, date, publisher, licence, full-text links)",
  hosts: [
    {
      host: "api.crossref.org",
      userAgent: "polite",
      note: "A mailto in the User-Agent puts requests in the polite pool (10/s instead of 5/s); the advertised limit is then honoured automatically",
    },
  ],
  query: {
    keyLabel: "DOI",
    description:
      "Look DOIs up in Crossref and print title, authors, container, date, type and publisher.\n\n" +
      "A DOI may be given bare (10.1080/…), as a doi: URI or as a doi.org URL; all three are\n" +
      "normalised. --search treats each key as citation text and reports the best-matching DOIs\n" +
      "instead. --links lists the full-text URLs Crossref knows for the work (publisher PDFs, often\n" +
      "paywalled — `bulk arxiv fetch` or `bulk archive-wayback fetch` may do better).\n\n" +
      "Requests carry a mailto User-Agent from the configured `contact`, which puts them in Crossref's\n" +
      "polite pool (10 requests/s rather than 5); the advertised limit is then honoured automatically.",
    examples: [
      "bulk crossref query 10.1080/16000870.2018.1440870",
      "bulk crossref query 10.5170/CERN-2004-003-V-1 --links",
      'bulk crossref query --search "Introduction to Algorithms Cormen" --rows 3',
      "bulk crossref query --from dois.txt --cache crossref.json --tsv works.tsv",
    ],
    options: [
      {
        kind: "boolean",
        name: "search",
        description: "Treat each key as citation text and report the best-matching DOIs",
      },
      {
        kind: "integer",
        name: "rows",
        value: "n",
        description: "With --search: how many candidates",
        default: 5,
        min: 1,
      },
      {
        kind: "boolean",
        name: "links",
        description: "List the full-text links Crossref knows for each work",
      },
    ],
    batchSize: 1,
    columns: [
      { key: "doi", width: 40 },
      {
        key: "title",
        value: (_k, r) => `${String(r.title ?? "")}${r.subtitle ? `: ${String(r.subtitle)}` : ""}`,
      },
      { key: "authors" },
      { key: "container" },
      { key: "issued", width: 10 },
      { key: "type", width: 20 },
      { key: "publisher" },
      { key: "cited_by", align: "right", width: 8 },
    ],
  },
};
