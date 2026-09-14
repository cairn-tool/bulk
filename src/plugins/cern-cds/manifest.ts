import type { PluginManifest } from "../../plugin/types.js";

export const manifest: PluginManifest = {
  id: "cern-cds",
  name: "CERN Document Server",
  summary:
    "CERN Document Server — records by OAI-PMH set, Invenio query or id; the Anubis gate is solved so files come from CDS",
  hosts: [
    {
      host: "cds.cern.ch",
      userAgent: "browser",
      challenge: "anubis",
      note: "/search, /record and every file are behind an Anubis proof-of-work gate, solved once and its cookie cached; /oai2d is open",
    },
    {
      host: "inspirehep.net",
      userAgent: "browser",
      note: "The no-solve fallback for files (--no-anubis)",
    },
  ],
  fetch: {
    description:
      "Pull CDS records into <dest>/<set or query>/<report number or record id> - <title>/<file>.\n\n" +
      "Catalogue: --set <OAI set> with --from/--until datestamps through /oai2d (open), or --query\n" +
      "<Invenio pattern> through /search?of=xm, or --record by id. /search and every file URL are\n" +
      "behind the Anubis proof-of-work challenge; it is solved once and the cookie cached (see\n" +
      "`bulk cache`), so files are pulled straight from CDS. --no-anubis leaves the challenge alone\n" +
      "and takes files from INSPIRE-HEP where INSPIRE holds them. Records are saved as MARCXML in\n" +
      "_records/<id>.xml and listed in _manifest.tsv with their 856 file URLs and sizes.",
    examples: [
      "bulk cern-cds list --set cerncds:BOOK --from 2026-01-01",
      "bulk cern-cds fetch --set cerncds:REPORT --from 2026-06-01 --dry-run",
      'bulk cern-cds fetch --query "reportnumber:CERN-2004-003*" --dest ~/archive/cds     # the documented search API',
      "bulk cern-cds fetch --record 823808 --record 782076                                 # named records",
    ],
    options: [
      {
        kind: "string",
        name: "set",
        value: "set",
        description:
          "OAI-PMH set (cerncds:BOOK, cerncds:REPORT, cerncds:FULLTEXT, cerncds:SCAN, …); repeatable",
        repeatable: true,
      },
      {
        kind: "string",
        name: "from",
        value: "yyyy-mm-dd",
        description: "With --set: records changed on or after",
      },
      {
        kind: "string",
        name: "until",
        value: "yyyy-mm-dd",
        description: "With --set: records changed on or before",
      },
      {
        kind: "string",
        name: "query",
        value: "pattern",
        description:
          "Invenio search pattern for /search?of=xm (reportnumber:CERN-2004-003*, author:ellis)",
      },
      {
        kind: "string",
        name: "record",
        value: "id",
        description: "A CDS record id; repeatable",
        repeatable: true,
      },
      {
        kind: "boolean",
        name: "no-anubis",
        description: "Do not solve the Anubis challenge; take files from INSPIRE instead of CDS",
      },
      {
        kind: "boolean",
        name: "no-inspire",
        description: "With --no-anubis: do not fall back to INSPIRE either",
      },
      {
        kind: "boolean",
        name: "all-formats",
        description: "Include the derivative files (icons, PDF/A) CDS lists with ?subformat=",
      },
    ],
    manifestColumns: [
      "dest",
      "url",
      "record",
      "report_number",
      "title",
      "date",
      "file",
      "bytes",
      "source",
      "cds_url",
      "inspire",
    ],
    listColumns: [
      { key: "record", width: 9 },
      { key: "report_number", width: 26 },
      { key: "source", width: 8 },
      { key: "bytes", align: "right", width: 10 },
      { key: "dest" },
    ],
    catalogueFile: "_records/<id>.xml",
    selectionRequired: true,
  },
};
