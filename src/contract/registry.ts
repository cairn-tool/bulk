import { BASE_FORMATS } from "../formats.js";
import { PLUGINS } from "../plugins/index.js";
import type { CommandContract, ExitCodeMeaning } from "./types.js";

const OK = (meaning: string): ExitCodeMeaning => ({ code: 0, meaning });
const USAGE: ExitCodeMeaning = {
  code: 1,
  meaning: "Invocation, I/O, network, or configuration error",
};
const FINDINGS = (meaning: string): ExitCodeMeaning => ({ code: 2, meaning });
const INTERRUPTED: ExitCodeMeaning = {
  code: 130,
  meaning: "Interrupted with Ctrl-C; the run can be resumed by re-running the same command",
};

const base = {
  formats: BASE_FORMATS,
  defaultFormat: "llm" as const,
  formatConfigurable: true,
  stream: { success: "stdout" as const },
  stability: "stable" as const,
};

function fetchContract(id: string): CommandContract {
  return {
    ...base,
    id: `${id} fetch`,
    outputSchema: "fetch-result",
    exitCodes: [
      OK("Every selected item is present and verified"),
      USAGE,
      FINDINGS("One or more items failed; the log says which"),
      INTERRUPTED,
    ],
    writes: true,
    network: true,
    notes:
      "Progress lines and the status bar go to stderr and only when it is a terminal; the payload is written after the run. Re-running the same command resumes: present files are skipped.",
  };
}

function listContract(id: string): CommandContract {
  return {
    ...base,
    id: `${id} list`,
    outputSchema: "list-result",
    exitCodes: [OK("Catalogue written"), USAGE, INTERRUPTED],
    writes: false,
    network: true,
    notes:
      "Enumerates the catalogue with the same selection options as fetch and downloads nothing. With --tsv the rows go to the file and the summary to stdout.",
  };
}

function queryContract(id: string): CommandContract {
  return {
    ...base,
    id: `${id} query`,
    outputSchema: "query-result",
    exitCodes: [
      OK("At least one key was found"),
      USAGE,
      FINDINGS("No key was found, or every lookup failed"),
      INTERRUPTED,
    ],
    writes: false,
    network: true,
    notes:
      "Answers are cached by normalised key; a miss is cached as null and an error is not cached. --tsv writes the table to a file and the summary to stdout.",
  };
}

const STATIC: CommandContract[] = [
  {
    ...base,
    id: "sources",
    outputSchema: "sources",
    exitCodes: [OK("Listing written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "cache list",
    outputSchema: "cache-list",
    exitCodes: [OK("Listing written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "cache clear",
    outputSchema: null,
    exitCodes: [OK("Cleared, or nothing to clear"), USAGE],
    writes: true,
    network: false,
    notes: "Writes only inside the cache directory.",
  },
  {
    ...base,
    id: "cache path",
    outputSchema: null,
    exitCodes: [OK("Path written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "cache limits",
    outputSchema: "cache-limits",
    exitCodes: [OK("Listing written"), USAGE],
    writes: false,
    network: false,
    notes:
      "Limits are learned per process, so outside a running command this shows the declared floors only.",
  },
  {
    ...base,
    id: "config path",
    outputSchema: null,
    exitCodes: [OK("Path written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "config show",
    outputSchema: "config",
    exitCodes: [OK("Configuration written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "config init",
    outputSchema: null,
    exitCodes: [OK("File written, or already present"), USAGE],
    writes: true,
    network: false,
    notes: "Writes only the configuration file, and never over an existing one.",
  },
  {
    ...base,
    id: "check-update",
    formatConfigurable: false,
    outputSchema: "check-update",
    exitCodes: [OK("Up to date"), USAGE, FINDINGS("A newer version is published")],
    writes: false,
    network: true,
  },
  {
    ...base,
    id: "describe",
    formatConfigurable: false,
    outputSchema: "describe",
    exitCodes: [OK("Description written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "schema",
    formatConfigurable: false,
    outputSchema: null,
    exitCodes: [OK("Schema or index written"), USAGE],
    writes: false,
    network: false,
    notes:
      "A schema document is written verbatim whatever the format; the flag affects only the index.",
  },
  {
    ...base,
    id: "completion",
    formatConfigurable: false,
    outputSchema: null,
    exitCodes: [OK("Script written"), USAGE],
    writes: false,
    network: false,
  },
  {
    ...base,
    id: "serve",
    formats: null,
    defaultFormat: null,
    formatConfigurable: false,
    outputSchema: null,
    exitCodes: [OK("Client disconnected"), USAGE],
    writes: false,
    network: true,
    notes:
      "stdout carries JSON-RPC frames; diagnostics go to stderr. Tools are the plugins' list and query commands; nothing downloads.",
  },
];

function generated(): CommandContract[] {
  const rows: CommandContract[] = [];
  for (const { manifest } of PLUGINS) {
    if (manifest.fetch) rows.push(fetchContract(manifest.id), listContract(manifest.id));
    if (manifest.query) rows.push(queryContract(manifest.id));
  }
  return rows;
}

/** Every visible command's contract, keyed by its space-joined id. */
export const COMMAND_CONTRACTS: Readonly<Record<string, CommandContract>> = Object.fromEntries(
  [...generated(), ...STATIC].map((contract) => [contract.id, contract]),
);
