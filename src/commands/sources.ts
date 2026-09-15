import { BOLD, DIM, RESET, resolveFormat, type FormatOptions } from "../formatters.js";
import { manifests } from "../plugins/index.js";
import { jsonPayload } from "../result.js";
import { runtime } from "../runtime.js";

export interface SourcesOptions extends FormatOptions {
  plugin?: string;
}

export function commandsOf(manifest: { id: string; fetch?: unknown; query?: unknown }): string[] {
  const out: string[] = [];
  if (manifest.fetch) out.push(`${manifest.id} fetch`, `${manifest.id} list`);
  if (manifest.query) out.push(`${manifest.id} query`);
  return out;
}

/** `bulk sources` — every plugin, its sub-commands and the hosts it talks to. */
export async function sourcesAction(opts: SourcesOptions): Promise<void> {
  const format = resolveFormat(opts, runtime().config.output.format);
  const all = manifests().filter((m) => !opts.plugin || m.id === opts.plugin);
  if (opts.plugin && !all.length) throw new Error(`Unknown plugin: ${opts.plugin}`);
  const plugins = all.map((m) => ({
    id: m.id,
    name: m.name,
    summary: m.summary,
    commands: commandsOf(m),
    hosts: m.hosts.map((h) => ({
      host: h.host,
      userAgent: h.userAgent,
      ...(h.minInterval ? { minInterval: h.minInterval } : {}),
      ...(h.challenge ? { challenge: h.challenge } : {}),
      ...(h.note ? { note: h.note } : {}),
    })),
  }));
  if (format === "json") {
    process.stdout.write(jsonPayload("sources", { count: plugins.length, plugins }, opts));
    return;
  }
  const human = format === "human";
  const width = Math.max(...plugins.map((p) => p.id.length));
  const lines: string[] = [];
  for (const p of plugins) {
    const id = human ? `${BOLD}${p.id.padEnd(width)}${RESET}` : p.id.padEnd(width);
    lines.push(`${id}  ${p.summary}`);
    const detail = `${"".padEnd(width)}  ${p.commands.join(", ")}  ·  ${p.hosts.map((h) => h.host).join(", ")}`;
    lines.push(human ? `${DIM}${detail}${RESET}` : detail);
  }
  lines.push(
    "",
    `${plugins.length} plugins. \`bulk <plugin> --help\` for a plugin's commands, \`bulk <plugin> --docs\` for its documentation.`,
  );
  process.stdout.write(lines.join("\n") + "\n");
}
