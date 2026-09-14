import path from "node:path";
import type { ResolvedConfig } from "../config.js";

/**
 * A fetch's destination: `--dest`, else the plugin's configured `dest`,
 * relative to the archive root when it is not absolute. Nothing is derived —
 * a fetch without either refuses to run and says which key would fix it.
 */
export function resolveDest(pluginId: string, config: ResolvedConfig, flag?: string): string {
  const configured = config.plugins[pluginId]?.dest;
  const chosen = flag ?? configured;
  if (!chosen)
    throw new Error(
      `No destination for ${pluginId} fetch: pass --dest DIR, or set plugins.${pluginId}.dest in ${config.configPath ?? "~/.config/bulk/config.yml"}`,
    );
  if (path.isAbsolute(chosen)) return chosen;
  if (flag) return path.resolve(chosen);
  if (!config.archive)
    throw new Error(
      `plugins.${pluginId}.dest is relative (${chosen}) but no archive root is set: set \`archive:\` in the config, BULK_ARCHIVE, or --archive`,
    );
  return path.join(config.archive, chosen);
}
