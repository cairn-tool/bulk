import type { BulkPlugin, PluginEntry, PluginManifest } from "../plugin/types.js";
import { manifest as archiveItems } from "./archive-items/manifest.js";
import { manifest as archiveWayback } from "./archive-wayback/manifest.js";
import { manifest as arxiv } from "./arxiv/manifest.js";
import { manifest as cernCds } from "./cern-cds/manifest.js";
import { manifest as cernYellowreports } from "./cern-yellowreports/manifest.js";
import { manifest as crossref } from "./crossref/manifest.js";
import { manifest as ietfRfc } from "./ietf-rfc/manifest.js";
import { manifest as ituR } from "./itu-r/manifest.js";
import { manifest as ituT } from "./itu-t/manifest.js";
import { manifest as nistTechpubs } from "./nist-techpubs/manifest.js";
import { manifest as noaaIr } from "./noaa-ir/manifest.js";
import { manifest as nrcAdams } from "./nrc-adams/manifest.js";
import { manifest as ntisNtrl } from "./ntis-ntrl/manifest.js";
import { manifest as ntrs } from "./ntrs/manifest.js";
import { manifest as ntsbAvdata } from "./ntsb-avdata/manifest.js";
import { manifest as ntsbCarol } from "./ntsb-carol/manifest.js";
import { manifest as ntsbDockets } from "./ntsb-dockets/manifest.js";
import { manifest as ntsbReports } from "./ntsb-reports/manifest.js";
import { manifest as openlibrary } from "./openlibrary/manifest.js";
import { manifest as osti } from "./osti/manifest.js";
import { manifest as usdaNal } from "./usda-nal/manifest.js";
import { manifest as usdaTreesearch } from "./usda-treesearch/manifest.js";

/**
 * Every plugin, as its manifest plus a lazy loader of its engine.
 *
 * The list is static rather than discovered: commander needs every option at
 * registration time for `--help`, `describe` and completion to be right without
 * loading a single engine, and a missing entry is then a build-time failure in
 * `tests/unit/plugin-manifests.test.ts` rather than a silently absent command.
 * A manifest imports nothing but types; the engine (parsers, HTML and XML
 * libraries) loads only when its command runs.
 */
export const PLUGINS: readonly PluginEntry[] = [
  { manifest: archiveItems, load: async () => (await import("./archive-items/index.js")).plugin },
  {
    manifest: archiveWayback,
    load: async () => (await import("./archive-wayback/index.js")).plugin,
  },
  { manifest: arxiv, load: async () => (await import("./arxiv/index.js")).plugin },
  { manifest: cernCds, load: async () => (await import("./cern-cds/index.js")).plugin },
  {
    manifest: cernYellowreports,
    load: async () => (await import("./cern-yellowreports/index.js")).plugin,
  },
  { manifest: crossref, load: async () => (await import("./crossref/index.js")).plugin },
  { manifest: ietfRfc, load: async () => (await import("./ietf-rfc/index.js")).plugin },
  { manifest: ituR, load: async () => (await import("./itu-r/index.js")).plugin },
  { manifest: ituT, load: async () => (await import("./itu-t/index.js")).plugin },
  { manifest: nistTechpubs, load: async () => (await import("./nist-techpubs/index.js")).plugin },
  { manifest: noaaIr, load: async () => (await import("./noaa-ir/index.js")).plugin },
  { manifest: nrcAdams, load: async () => (await import("./nrc-adams/index.js")).plugin },
  { manifest: ntisNtrl, load: async () => (await import("./ntis-ntrl/index.js")).plugin },
  { manifest: ntrs, load: async () => (await import("./ntrs/index.js")).plugin },
  { manifest: ntsbAvdata, load: async () => (await import("./ntsb-avdata/index.js")).plugin },
  { manifest: ntsbCarol, load: async () => (await import("./ntsb-carol/index.js")).plugin },
  { manifest: ntsbDockets, load: async () => (await import("./ntsb-dockets/index.js")).plugin },
  { manifest: ntsbReports, load: async () => (await import("./ntsb-reports/index.js")).plugin },
  { manifest: openlibrary, load: async () => (await import("./openlibrary/index.js")).plugin },
  { manifest: osti, load: async () => (await import("./osti/index.js")).plugin },
  { manifest: usdaNal, load: async () => (await import("./usda-nal/index.js")).plugin },
  {
    manifest: usdaTreesearch,
    load: async () => (await import("./usda-treesearch/index.js")).plugin,
  },
];

export function pluginFor(id: string): PluginEntry | undefined {
  return PLUGINS.find((entry) => entry.manifest.id === id);
}

export function manifests(): readonly PluginManifest[] {
  return PLUGINS.map((entry) => entry.manifest);
}

export async function loadPlugin(id: string): Promise<BulkPlugin> {
  const entry = pluginFor(id);
  if (!entry) throw new Error(`Unknown plugin: ${id}. Run \`bulk sources\` to list them.`);
  return entry.load();
}
