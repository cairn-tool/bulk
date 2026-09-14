import type { BulkPlugin, PluginEntry, PluginManifest } from "../plugin/types.js";
import { manifest as ntsbReports } from "./ntsb-reports/manifest.js";
import { manifest as openlibrary } from "./openlibrary/manifest.js";

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
  { manifest: ntsbReports, load: async () => (await import("./ntsb-reports/index.js")).plugin },
  { manifest: openlibrary, load: async () => (await import("./openlibrary/index.js")).plugin },
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
