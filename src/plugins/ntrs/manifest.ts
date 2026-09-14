import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "ntrs",
  name: "NASA Technical Reports Server",
  summary:
    "NASA Technical Reports Server — citation by accession number, or best match for a title",
  hosts: [{ host: "ntrs.nasa.gov", userAgent: "polite" }],
  query: {
    keyLabel: "accession number",
    description:
      "Look accession numbers up on NTRS (title, report numbers, date, authors, center), or with\n" +
      "--search treat each key as a title and keep the best-matching record.\n\n" +
      "An accession number is the 11-digit id NTRS files carry (19730060780); the API answers 404\n" +
      "for the Apollo-era records NTRS withdrew in 2013. --search sends each key as a title query\n" +
      "and keeps the best hit whose word overlap with the query is at least --min-score.",
    examples: [
      "bulk ntrs query 19730060780 19660014374",
      'bulk ntrs query --search "Saturn V Flight Manual SA-503" --min-score 0.6',
      "bulk ntrs query --from ids.txt --cache ntrs.json --tsv ntrs.tsv",
    ],
    options: [
      {
        kind: "boolean",
        name: "search",
        description: "Keys are titles: search NTRS and keep the best match",
      },
      {
        kind: "number",
        name: "min-score",
        value: "f",
        description: "With --search: minimum word overlap to accept a hit",
        default: 0.6,
        min: 0,
        max: 1,
      },
    ],
    batchSize: 1,
    columns: [
      { key: "key", width: 40 },
      { key: "id", width: 11 },
      { key: "title" },
      { key: "reportNumbers" },
      { key: "date", width: 10 },
      { key: "authors" },
      { key: "center", width: 6 },
      { key: "score", align: "right", width: 5 },
    ],
  },
};
