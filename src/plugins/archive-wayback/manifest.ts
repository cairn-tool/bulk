import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "archive-wayback",
  name: "Wayback Machine",
  summary:
    "Wayback Machine — snapshots of URLs on hosts that block scripts; the recourse for a Cloudflare-gated publisher",
  hosts: [
    {
      host: "web.archive.org",
      userAgent: "browser",
      note: "CDX answers 503 under load; it is retried three times with a growing pause",
    },
  ],
  fetch: {
    description:
      "Pull Wayback snapshots into <dest>/<host>/<path>[ (<timestamp>)].<ext>.\n\n" +
      "Give a URL or a pattern (--url 'pcisig.com*' with --match prefix), or a file of them. The\n" +
      "CDX index is queried for each (saved as _cdx.tsv), collapsed to one row per distinct content\n" +
      "digest, filtered by --mimetype, --status and a --since/--until capture window; --all-captures\n" +
      "keeps every distinct capture instead of only the newest per URL. Files come from the `id_`\n" +
      "raw form, so the bytes are the original document, not a rewritten page, and are verified by\n" +
      "magic.",
    examples: [
      "bulk archive-wayback fetch --url 'pcisig.com*' --match prefix --mimetype application/pdf --dest ~/archive/wayback",
      "bulk archive-wayback fetch --url https://www.intel.com/some/doc.pdf",
      "bulk archive-wayback fetch --urls-from urls.txt --since 2006-01-01 --until 2010-12-31 --dry-run",
      "bulk archive-wayback list --url 'dl.acm.org*' --match prefix",
    ],
    options: [
      {
        kind: "string",
        name: "url",
        value: "url",
        description: "A URL or pattern; repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "urls-from",
        value: "file",
        description: "URLs from a file, one per line",
        complete: "file",
      },
      {
        kind: "string",
        name: "match",
        value: "type",
        description: "CDX match type for a pattern (prefix for 'host.com*')",
        choices: ["exact", "prefix", "host", "domain"],
      },
      {
        kind: "string",
        name: "mimetype",
        value: "type",
        description: "Only captures of this MIME type (application/pdf)",
      },
      {
        kind: "string",
        name: "status",
        value: "code",
        description: "Only captures with this status ('' for any)",
        default: "200",
      },
      { kind: "string", name: "since", value: "yyyy-mm-dd", description: "Captures on or after" },
      { kind: "string", name: "until", value: "yyyy-mm-dd", description: "Captures on or before" },
      {
        kind: "boolean",
        name: "all-captures",
        description: "Every distinct capture, not just the newest per URL",
      },
      {
        kind: "integer",
        name: "cdx-limit",
        value: "n",
        description: "Cap the CDX rows per URL",
        default: 0,
        min: 0,
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "original",
      "timestamp",
      "mimetype",
      "statuscode",
      "digest",
      "length",
      "host",
    ],
    listColumns: [
      { key: "timestamp", width: 16 },
      { key: "mimetype", width: 24 },
      { key: "length", align: "right", width: 10 },
      { key: "original" },
    ],
    catalogueFile: "_cdx.json",
    selectionRequired: true,
  },
};
