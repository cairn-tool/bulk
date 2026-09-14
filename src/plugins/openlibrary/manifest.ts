import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "openlibrary",
  name: "Open Library",
  summary: "Open Library records by ISBN — title, authors, date, publisher",
  hosts: [
    {
      host: "openlibrary.org",
      userAgent: "polite",
      note: "Open Library asks for a contact in the User-Agent",
    },
  ],
  query: {
    keyLabel: "ISBN",
    description:
      "Look ISBNs up in Open Library and print title, subtitle, authors, date and publisher.\n\n" +
      "ISBN-10s are converted to ISBN-13 and check digits verified before anything is sent.\n" +
      "Twenty ISBNs go in one request; a cache makes re-runs free for known ISBNs.",
    examples: [
      "bulk openlibrary query 9780071449595 0071449590",
      "bulk openlibrary query --from isbns.txt --cache openlibrary.json --tsv books.tsv",
      "bulk openlibrary query --find some-text-file.txt      # extract ISBNs from text, then look them up",
    ],
    options: [
      {
        kind: "string",
        name: "find",
        value: "file",
        description: "Extract ISBNs from this text file (repeatable)",
        repeatable: true,
        complete: "file",
      },
    ],
    batchSize: 20,
    columns: [
      { key: "isbn", width: 13 },
      {
        key: "title",
        value: (_k, r) => `${String(r.title ?? "")}${r.subtitle ? `: ${String(r.subtitle)}` : ""}`,
      },
      { key: "authors" },
      { key: "date", width: 12 },
      { key: "publisher", value: (_k, r) => r.publishers },
      { key: "pages", align: "right", width: 6 },
    ],
  },
};
