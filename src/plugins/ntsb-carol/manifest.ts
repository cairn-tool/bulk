import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "ntsb-carol",
  name: "NTSB CAROL case database",
  summary:
    "NTSB CAROL case database — every case record (findings, narratives, probable cause) exported year by year, JSON and CSV",
  hosts: [
    {
      host: "data.ntsb.gov",
      userAgent: "browser",
      note: "The JSON API behind the CAROL SPA: a session id, then templated queries; exports are capped at 10,000 cases",
    },
  ],
  fetch: {
    description:
      "Export the CAROL case database into <dest>/<year>/cases-<year>[-<mm>]-{data,summary}.zip, unzipped\n" +
      "beside the zip (cases-….json / cases-….csv + readme.txt).\n\n" +
      "`data` is the full case record — vehicles, engines, findings with codes, the CICTT event\n" +
      "sequence, injuries, coordinates, probable cause, the factual, analysis and preliminary\n" +
      "narratives. `summary` is the 45-column CSV the UI exports, whose last two columns are the\n" +
      "docket URL (data.ntsb.gov/Docket?ProjectID=<Mkey>) and the report URL. A year larger than the\n" +
      "10,000-case export cap is taken month by month. Re-running skips years already exported;\n" +
      "--refresh redoes them (the current and previous year change as cases close). With --reports,\n" +
      "the generated report PDF of every aviation case in the year's summary is pulled too, into\n" +
      "<year>/reports/.",
    examples: [
      "bulk ntsb-carol fetch --dest ~/archive/ntsb/carol                # every year, 1948 to now, data and summary",
      "bulk ntsb-carol fetch --year 2019 --year 2020",
      "bulk ntsb-carol fetch --from-year 2024 --refresh                 # redo the years still changing",
      "bulk ntsb-carol fetch --year 2019 --export summary --reports",
      "bulk ntsb-carol list                                             # case counts per year, exporting nothing",
    ],
    options: [
      {
        kind: "integer",
        name: "year",
        value: "yyyy",
        description: "This event year; repeatable",
        repeatable: true,
        min: 1948,
      },
      {
        kind: "integer",
        name: "from-year",
        value: "yyyy",
        description: "First year (default 1948)",
        min: 1948,
      },
      {
        kind: "integer",
        name: "to-year",
        value: "yyyy",
        description: "Last year (default: this year)",
        min: 1948,
      },
      {
        kind: "string",
        name: "export",
        value: "what",
        description: "What to export",
        choices: ["data", "summary", "both"],
        default: "both",
      },
      {
        kind: "boolean",
        name: "reports",
        description: "Also pull each aviation case's generated report PDF (from the summary CSV)",
      },
      { kind: "boolean", name: "refresh", description: "Re-export years already present" },
    ],
    manifestColumns: ["dest", "url", "year", "month", "format", "count", "exported"],
    listColumns: [
      { key: "period", width: 8 },
      { key: "count", align: "right", width: 8 },
    ],
    catalogueFile: "_periods.json",
  },
};
