import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "ietf-rfc",
  name: "The RFC series (RFC Editor)",
  summary:
    "RFCs from the RFC Editor by number range or missing-from a folder; PDF with text fallbacks",
  hosts: [
    {
      host: "www.rfc-editor.org",
      userAgent: "browser",
      note: "Plain files; no login, no challenge, no rate limit met at 2 s pacing",
    },
  ],
  fetch: {
    description:
      "Pull RFCs into <dest>/RFC N000-N999/RFC <n> - <title>.pdf.\n\n" +
      "The catalogue is rfc-index.xml (every RFC with title, date, status and formats), saved as\n" +
      "_rfc-index.xml. Select a --from/--to number range, or --missing-from a folder that already\n" +
      "holds `RFC <n> - …` files. Each RFC is taken as the RFC Editor's own PDF rendering; when that\n" +
      "does not exist the text-as-PDF rendering is tried, then the plain text (as `.txt`).",
    examples: [
      "bulk ietf-rfc fetch --from 9000 --to 9010 --dest ~/archive/ietf",
      "bulk ietf-rfc fetch --missing-from ~/archive/Standards/IETF",
      "bulk ietf-rfc fetch --from 9000 --to 9010 --dry-run",
      "bulk ietf-rfc list --from 10000",
    ],
    options: [
      { kind: "integer", name: "from", value: "n", description: "First RFC number", min: 1 },
      { kind: "integer", name: "to", value: "n", description: "Last RFC number", min: 1 },
      {
        kind: "string",
        name: "missing-from",
        value: "dir",
        description: "Skip numbers a folder already holds as `RFC <n> - …` files",
        complete: "directory",
      },
    ],
    manifestColumns: ["dest", "url", "number", "title", "date", "status", "formats", "fallbacks"],
    listColumns: [
      { key: "number", header: "RFC", width: 6, align: "right" },
      { key: "date", width: 9 },
      { key: "status", width: 22 },
      { key: "title" },
    ],
    catalogueFile: "_rfc-index.xml",
  },
};
