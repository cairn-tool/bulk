import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "arxiv",
  name: "arXiv e-prints",
  summary:
    "arXiv e-prints — papers by search, category or identifier; PDFs (or the submitted source), versioned",
  hosts: [
    {
      host: "export.arxiv.org",
      userAgent: "browser",
      minInterval: 3,
      note: "arXiv asks for one API request every three seconds and enforces it with a long block; a 429 is fatal, not retried",
    },
    {
      host: "arxiv.org",
      userAgent: "browser",
      note: "The PDF and e-print files; not rate-limited the same way",
    },
  ],
  fetch: {
    description:
      "Pull arXiv papers into <dest>/<primary category>/<arXiv id> - <title>.pdf.\n\n" +
      "Select with --id, or a search: --query (the arXiv search_query syntax), --category, --author,\n" +
      "--title, combined with AND. The Atom feed of each page is kept under _feed/, the papers in\n" +
      "_papers.tsv and _manifest.tsv. --source takes the submitted e-print archive (/e-print/)\n" +
      "instead of the PDF, --with-source takes both.\n\n" +
      "arXiv asks for one API request every three seconds; that pacing is applied automatically, so\n" +
      "a large --limit simply takes its time (100 papers a page).",
    examples: [
      "bulk arxiv fetch --id 1706.03762 --id cs/9901002 --dest ~/archive/arxiv",
      "bulk arxiv fetch --category cs.AR --limit 20",
      "bulk arxiv fetch --query 'cat:cs.AR AND abs:\"cache coherence\"' --limit 50 --dry-run",
      'bulk arxiv list --author Hennessy --title "computer architecture"',
    ],
    options: [
      {
        kind: "string",
        name: "id",
        value: "id",
        description: "An arXiv identifier (1706.03762, cs/9901002); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "query",
        value: "q",
        description: 'arXiv search_query syntax (cat:cs.AR AND abs:"cache coherence")',
      },
      {
        kind: "string",
        name: "category",
        value: "cat",
        description: "A category (cs.AR, hep-ex); repeatable, ANDed",
        repeatable: true,
      },
      {
        kind: "string",
        name: "author",
        value: "name",
        description: "An author; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "title",
        value: "words",
        description: "Words in the title; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "sort",
        value: "by",
        description: "Search order",
        choices: ["submittedDate", "lastUpdatedDate", "relevance"],
        default: "submittedDate",
      },
      {
        kind: "string",
        name: "order",
        value: "dir",
        description: "Sort direction",
        choices: ["descending", "ascending"],
        default: "descending",
      },
      {
        kind: "boolean",
        name: "source",
        description: "Take the submitted e-print source instead of the PDF",
      },
      { kind: "boolean", name: "with-source", description: "Take both the PDF and the source" },
    ],
    manifestColumns: [
      "dest",
      "url",
      "arxiv_id",
      "version",
      "title",
      "authors",
      "primary_category",
      "categories",
      "published",
      "updated",
      "doi",
      "journal_ref",
      "comment",
      "kind",
    ],
    listColumns: [
      { key: "arxiv_id", width: 18 },
      { key: "published", width: 11 },
      { key: "primary_category", header: "category", width: 12 },
      { key: "title" },
    ],
    catalogueFile: "_feed/page1.xml",
    selectionRequired: true,
  },
};
