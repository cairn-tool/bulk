import fs from "node:fs";
import path from "node:path";
import { templateConfig } from "../config.js";
import { resolveFormat, keyValues, type FormatOptions } from "../formatters.js";
import { configPath } from "../paths.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";

/** `bulk config path` — where the configuration is read from. */
export async function configPathAction(opts: FormatOptions): Promise<void> {
  const format = resolveFormat(opts, runtime().config.output.format);
  const file = configPath();
  if (format === "json")
    process.stdout.write(
      jsonPayload("config path", { configPath: file, exists: fs.existsSync(file) }, opts),
    );
  else process.stdout.write(file + (fs.existsSync(file) ? "" : "  (not present)") + "\n");
}

/** `bulk config show` — the resolved settings, defaults included. */
export async function configShowAction(opts: FormatOptions): Promise<void> {
  const config = runtime().config;
  const format = resolveFormat(opts, config.output.format);
  const file = configPath();
  const payload = {
    configPath: config.configPath ?? null,
    exists: Boolean(config.configPath),
    cacheDir: config.cacheDir,
    archive: config.archive ?? null,
    contact: config.contact ?? null,
    delay: config.delay,
    output: config.output,
    hosts: config.hosts,
    limits: config.limits,
    plugins: config.plugins,
    query: config.query,
    challenge: config.challenge,
  };
  if (format === "json") {
    process.stdout.write(jsonPayload("config show", payload, opts));
    return;
  }
  const lines = keyValues(
    [
      ["config", config.configPath ?? `${file} (not present; defaults)`],
      ["cache", config.cacheDir],
      ["archive", config.archive ?? "(unset — relative destinations refuse to run)"],
      ["contact", config.contact ?? "(unset — polite User-Agents carry the package name only)"],
      ["delay", `${config.delay}s between downloads; ${config.query.delay}s between queries`],
      ["format", config.output.format],
      ["hosts", Object.keys(config.hosts).length ? JSON.stringify(config.hosts) : "(none)"],
      ["limits", Object.keys(config.limits).length ? JSON.stringify(config.limits) : "(none)"],
    ],
    format === "human",
  );
  const plugins = Object.entries(config.plugins);
  if (plugins.length) {
    lines.push("", "plugins:");
    for (const [id, p] of plugins) lines.push(`  ${id.padEnd(20)} ${JSON.stringify(p)}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

/** `bulk config init` — write a starter file, never over an existing one. */
export async function configInitAction(opts: FormatOptions): Promise<void> {
  const format = resolveFormat(opts, runtime().config.output.format);
  const file = configPath();
  const existed = fs.existsSync(file);
  if (!existed) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, templateConfig(), { encoding: "utf-8", flag: "wx" });
  }
  if (format === "json")
    process.stdout.write(jsonPayload("config init", { configPath: file, created: !existed }, opts));
  else process.stdout.write(existed ? `already present: ${file}\n` : `wrote ${file}\n`);
}
