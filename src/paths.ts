import os from "node:os";
import path from "node:path";

/**
 * The only module that knows where user-level files live. Every helper takes the
 * environment and home directory as parameters so tests can point them at a
 * temporary directory without touching `process.env`.
 *
 * Two roots and nothing else:
 *
 *   config   $BULK_CONFIG | $XDG_CONFIG_HOME/bulk/config.yml | ~/.config/bulk/config.yml
 *   cache    $BULK_CACHE  | $XDG_CACHE_HOME/bulk             | ~/.cache/bulk
 *
 * The archive root — where fetched files land — is *not* a path this module
 * decides: it comes from `--archive`, `BULK_ARCHIVE`, or the config file, and a
 * fetch refuses to run without a destination (see `src/pull/dest.ts`).
 */

export interface PathEnvironment {
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}

function trimmed(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

export function configPath({
  env = process.env,
  homedir = os.homedir(),
}: PathEnvironment = {}): string {
  const explicit = trimmed(env.BULK_CONFIG);
  if (explicit) return path.resolve(explicit);
  const xdg = trimmed(env.XDG_CONFIG_HOME);
  return path.join(xdg ?? path.join(homedir, ".config"), "bulk", "config.yml");
}

export function cacheDir({
  env = process.env,
  homedir = os.homedir(),
}: PathEnvironment = {}): string {
  const explicit = trimmed(env.BULK_CACHE);
  if (explicit) return path.resolve(explicit);
  const xdg = trimmed(env.XDG_CACHE_HOME);
  return path.join(xdg ?? path.join(homedir, ".cache"), "bulk");
}

/** The archive root from the environment alone; the config file may also name one. */
export function archiveFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = trimmed(env.BULK_ARCHIVE);
  return value ? path.resolve(value) : undefined;
}

/** Every environment variable the tool reads, published through `describe`. */
export const ENVIRONMENT_VARIABLES = [
  {
    name: "BULK_CONFIG",
    meaning: "Path of the configuration file (default ~/.config/bulk/config.yml)",
  },
  { name: "BULK_CACHE", meaning: "Cache directory (default ~/.cache/bulk)" },
  { name: "BULK_ARCHIVE", meaning: "Archive root that relative destinations resolve under" },
  { name: "BULK_CONTACT", meaning: "Contact address sent in polite User-Agents" },
  { name: "BULK_HOSTS", meaning: "Host overrides, `host=base-url` pairs separated by commas" },
  { name: "BULK_NO_UPDATE_NOTIFIER", meaning: "Set to 1 to silence the update notice" },
  { name: "XDG_CONFIG_HOME", meaning: "Base for the default configuration path" },
  { name: "XDG_CACHE_HOME", meaning: "Base for the default cache directory" },
] as const;
