import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "ntsb-avdata",
  name: "NTSB aviation database dumps",
  summary:
    "NTSB aviation database dumps — avall.zip (monthly, 96 MB), Pre2008 / PRE1982, the monthly deltas and schema PDFs",
  hosts: [
    {
      host: "data.ntsb.gov",
      userAgent: "browser",
      note: "Static links; byte ranges are ignored, so every download is whole. The dataset moves to the Enterprise API on 2027-04-05",
    },
  ],
  fetch: {
    description:
      "Pull the files listed at data.ntsb.gov/avdata/ into <dest>/<name> (<listed date>).<ext>.\n\n" +
      "The listing gives each file's date and size; a file is skipped when a copy at that date and\n" +
      "size is already present, and a rebuilt avall.zip (new date, new size) lands beside the\n" +
      "previous one rather than over it — the monthly builds accumulate. Byte ranges are not\n" +
      "honoured by the server, so every download is whole. The NTSB has announced that this\n" +
      "dataset moves to its Enterprise API on 2027-04-05.",
    examples: [
      "bulk ntsb-avdata fetch --dest ~/archive/ntsb/avdata        # everything listed",
      "bulk ntsb-avdata fetch --only avall.zip                     # the current full database",
      "bulk ntsb-avdata fetch --monthly                            # the twelve upNNMMM.zip deltas",
      "bulk ntsb-avdata list",
    ],
    options: [
      {
        kind: "string",
        name: "only",
        value: "name",
        description: "Only this listed file (avall.zip); repeatable",
        repeatable: true,
      },
      { kind: "boolean", name: "monthly", description: "Only the upNNMMM.zip monthly deltas" },
    ],
    manifestColumns: ["dest", "url", "name", "listed_date", "bytes"],
    listColumns: [
      { key: "name", width: 24 },
      { key: "listed_date", width: 10 },
      { key: "bytes", align: "right", width: 11 },
    ],
    catalogueFile: "_avdata-list.html",
  },
};
