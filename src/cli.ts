#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { CommandExit } from "./command-result.js";
import { BASE_FORMATS } from "./formats.js";
import { FETCH_COMMON, LIST_COMMON, QUERY_COMMON, applyOptions } from "./plugin/options.js";
import type { PluginManifest } from "./plugin/types.js";
import { PLUGINS } from "./plugins/index.js";
import { initializeRuntime } from "./runtime.js";
import { CHECK_COMMAND, REFRESH_COMMAND, installUpdateNotifier } from "./update-notifier.js";
import { packageName, packageVersion as version } from "./version.js";

// Expand -fh/-fj shorthands into --format values before Commander sees them
// (Commander does not support multi-character short flags).
const argv = process.argv.map((arg) => {
  if (arg === "-fh") return "--format=human";
  if (arg === "-fj") return "--format=json";
  return arg;
});

// A downstream reader closing the pipe early is normal shell usage, not an error:
// `describe -fj | head` does it. Larger payloads would otherwise surface EPIPE.
for (const stream of [process.stdout, process.stderr])
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code !== "EPIPE") throw error;
  });

// The configuration is read once, up front, so a malformed file is one clear
// error before any command runs. The internal refresh reads the same file.
try {
  initializeRuntime();
} catch (error) {
  process.stderr.write(`Error: ${(error as Error).message}\n`);
  process.exit(1);
}

installUpdateNotifier({
  currentVersion: version,
  packageName,
  argv,
  entryPoint: fileURLToPath(import.meta.url),
});

const FORMAT_HELP = `\nFormat shorthands:\n  -fh             Shorthand for --format=human\n  -fj             Shorthand for --format=json`;

const program = new Command()
  .name("bulk")
  .description(
    "Pull publisher catalogues into a document archive and look titles up by identifier.\n" +
      "One plugin per data source: `bulk <plugin> fetch|list|query`. Every fetch is resumable,\n" +
      "verifies what it downloads and logs what it did; `bulk sources` lists the plugins.",
  )
  .version(version)
  .addHelpText(
    "after",
    "\nExamples:\n" +
      "  bulk sources                                   every plugin and its commands\n" +
      "  bulk ntsb-reports list --mode Aviation         the catalogue, nothing downloaded\n" +
      "  bulk ntsb-reports fetch --dest ~/archive/ntsb  pull and verify every report\n" +
      "  bulk openlibrary query 9780262033848           a title from an ISBN\n" +
      "  bulk crossref query 10.1080/16000870.2018.1440870 --links\n" +
      "  bulk cache limits                              the per-host pacing in force\n" +
      FORMAT_HELP,
  );

function common(command: Command): Command {
  return command
    .option("--format <fmt>", `Output format: ${BASE_FORMATS.join(", ")}`)
    .option("--envelope", "Wrap --format json output in the versioned result envelope");
}

function exitHelp(lines: string[]): string {
  return "\n\nExit codes:\n" + lines.map((l) => `  ${l}`).join("\n") + "\n" + FORMAT_HELP;
}

function registerPlugin(manifest: PluginManifest): void {
  const group = program
    .command(manifest.id)
    .description(manifest.summary)
    .addHelpText(
      "after",
      `\n${manifest.name}. Hosts: ${manifest.hosts.map((h) => h.host).join(", ")}.\n\`bulk ${manifest.id} <command> --help\` for a command's options.`,
    );

  if (manifest.fetch) {
    const fetch = manifest.fetch;
    const fetchCommand = group
      .command("fetch")
      .description(fetch.description.split("\n")[0])
      .addHelpText(
        "after",
        "\n" +
          fetch.description +
          "\n\nExamples:\n" +
          fetch.examples.map((e) => `  ${e}`).join("\n") +
          exitHelp([
            "0    Every selected item is present and verified",
            "1    Invocation, configuration, or catalogue error (nothing pulled)",
            "2    One or more items failed; the log says which — re-run to retry",
            "130  Interrupted; re-run to resume",
          ]),
      );
    applyOptions(fetchCommand, fetch.options);
    applyOptions(fetchCommand, FETCH_COMMON);
    common(fetchCommand)
      .option("--quiet", "No per-item progress on stderr")
      .action(async (opts: Record<string, unknown>) => {
        const { fetchAction } = await import("./commands/fetch.js");
        return fetchAction(manifest, opts as never);
      });

    const listCommand = group
      .command("list")
      .description(`Enumerate the catalogue with fetch's selection options; download nothing`)
      .addHelpText(
        "after",
        "\nThe same selection options as `fetch`, the catalogue rows as a table, --tsv or JSON.\n\nExamples:\n" +
          fetch.examples
            .filter((e) => e.includes(" fetch"))
            .slice(0, 2)
            .map((e) => `  ${e.replace(" fetch", " list").replace(/ --dest \S+/, "")}`)
            .join("\n") +
          exitHelp([
            "0    Catalogue written",
            "1    Invocation, configuration, or catalogue error",
            "130  Interrupted",
          ]),
      );
    applyOptions(listCommand, fetch.options);
    applyOptions(listCommand, LIST_COMMON);
    common(listCommand)
      .option(
        "--dest <dir>",
        "Keep the catalogue snapshot in this directory instead of a temporary one",
      )
      .option("--quiet", "No progress on stderr")
      .action(async (opts: Record<string, unknown>) => {
        const { listAction } = await import("./commands/list.js");
        return listAction(manifest, opts as never);
      });
  }

  if (manifest.query) {
    const query = manifest.query;
    const queryCommand = group
      .command("query")
      .description(query.description.split("\n")[0])
      .argument("[keys...]", `${query.keyLabel}s to look up`)
      .addHelpText(
        "after",
        "\n" +
          query.description +
          "\n\nExamples:\n" +
          query.examples.map((e) => `  ${e}`).join("\n") +
          exitHelp([
            "0    At least one key was found",
            "1    Nothing valid to look up, or an invocation error",
            "2    No key was found",
            "130  Interrupted",
          ]),
      );
    applyOptions(queryCommand, query.options);
    applyOptions(queryCommand, QUERY_COMMON);
    common(queryCommand)
      .option("--quiet", "No per-key progress on stderr")
      .action(async (keys: string[], opts: Record<string, unknown>) => {
        const { queryAction } = await import("./commands/query.js");
        return queryAction(manifest, keys, opts as never);
      });
  }
}

for (const entry of PLUGINS) registerPlugin(entry.manifest);

common(
  program
    .command("sources")
    .description("List every plugin, its commands, and the hosts it talks to")
    .option("--plugin <id>", "Only this plugin")
    .addHelpText(
      "after",
      exitHelp(["0  Listing written", "1  Unknown plugin or invocation error"]),
    ),
).action(async (opts) => {
  const { sourcesAction } = await import("./commands/sources.js");
  return sourcesAction(opts);
});

const cache = program
  .command("cache")
  .description("View and clear the cached bot-challenge cookies, and the rate limits in force")
  .addHelpText(
    "after",
    "\nCookies live under the cache directory (`bulk cache path`), one jar per solver and host.",
  );
common(cache.command("list").description("Every cached challenge cookie, with its state")).action(
  async (opts) => {
    const { cacheListAction } = await import("./commands/cache.js");
    return cacheListAction(opts);
  },
);
common(
  cache
    .command("clear")
    .description("Remove cached cookies: all, one solver's, or one host's")
    .option("--solver <name>", "Only this solver (anubis)")
    .option("--host <host>", "Only this host"),
).action(async (opts) => {
  const { cacheClearAction } = await import("./commands/cache.js");
  return cacheClearAction(opts);
});
common(cache.command("path").description("Print the cache directory")).action(async (opts) => {
  const { cachePathAction } = await import("./commands/cache.js");
  return cachePathAction(opts);
});
common(
  cache
    .command("limits")
    .description("The per-host rate limits in force: declared floors and what this process learned")
    .option("--all", "Also list hosts with no limit in force"),
).action(async (opts) => {
  const { cacheLimitsAction } = await import("./commands/cache.js");
  return cacheLimitsAction(opts);
});

const config = program
  .command("config")
  .description("Locate, show, or create the user configuration file")
  .addHelpText(
    "after",
    "\nThe file is ~/.config/bulk/config.yml (BULK_CONFIG, XDG_CONFIG_HOME); see docs/configuration.md.",
  );
common(config.command("path").description("Print the configuration file path")).action(
  async (opts) => {
    const { configPathAction } = await import("./commands/config.js");
    return configPathAction(opts);
  },
);
common(
  config.command("show").description("Print the resolved configuration, defaults included"),
).action(async (opts) => {
  const { configShowAction } = await import("./commands/config.js");
  return configShowAction(opts);
});
common(
  config
    .command("init")
    .description("Write a starter configuration file, never over an existing one"),
).action(async (opts) => {
  const { configInitAction } = await import("./commands/config.js");
  return configInitAction(opts);
});

common(
  program
    .command(CHECK_COMMAND)
    .description("Query the configured npm registry for the latest published version")
    .addHelpText(
      "after",
      exitHelp([
        "0  Up to date",
        "1  Could not resolve the latest version",
        "2  A newer version is published",
      ]),
    ),
).action(async (opts) => {
  const { checkUpdateAction } = await import("./commands/update-check.js");
  return checkUpdateAction(packageName, version, opts);
});

program.command(REFRESH_COMMAND, { hidden: true }).action(async () => {
  const { refreshUpdateCacheAction } = await import("./commands/update-check.js");
  return refreshUpdateCacheAction(packageName);
});

program
  .command("describe")
  .description("Describe the CLI contract: commands, options, exit codes, and schemas")
  .argument("[command...]", "Narrow to one command path")
  .option("--format <fmt>", `Output format: ${BASE_FORMATS.join(", ")}`)
  .addHelpText("after", FORMAT_HELP)
  .action(async (commandPath: string[], opts) => {
    const { describeAction } = await import("./commands/describe.js");
    return describeAction(program, commandPath, {
      ...opts,
      toolName: packageName,
      toolVersion: version,
    });
  });

program
  .command("schema")
  .description("Print a published output schema, or list the available schemas")
  .argument("[id]", "Schema id, e.g. fetch-result")
  .option("--format <fmt>", `Output format for the index: ${BASE_FORMATS.join(", ")}`)
  .action(async (id: string | undefined, opts) => {
    const { schemaAction } = await import("./commands/schema.js");
    return schemaAction(id, opts);
  });

program
  .command("completion")
  .description("Print a shell completion script for bash, zsh, fish, or powershell")
  .argument("[shell]", "bash, zsh, fish, or powershell")
  .option("--format <fmt>", "Accepted for uniformity; the script is the output")
  .action(async (shell: string | undefined, opts) => {
    const { completionAction } = await import("./commands/completion.js");
    return completionAction(program, shell, {
      format: opts.format ?? "llm",
      toolName: packageName,
      toolVersion: version,
    });
  });

try {
  await program.parseAsync(argv);
} catch (error) {
  if (error instanceof CommandExit) {
    process.exitCode = error.exitCode;
  } else {
    process.stderr.write(`Error: ${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}
