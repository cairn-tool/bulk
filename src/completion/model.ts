import type { Command } from "commander";
import { walkCommands, type DescribedCommand, type DescribedOption } from "../contract/describe.js";
import { COMMAND_CONTRACTS } from "../contract/registry.js";
import { PLUGINS } from "../plugins/index.js";
import { FETCH_COMMON, LIST_COMMON, QUERY_COMMON, completionHints } from "../plugin/options.js";

/** The shells a script can be generated for. */
export const SHELLS = ["bash", "zsh", "fish", "powershell"] as const;
export type Shell = (typeof SHELLS)[number];

/** What a shell should offer after an option that takes a value. */
export type ValueKind = "none" | "choice" | "file" | "directory" | "free";

export interface CompletionOption {
  /** Long form including the leading dashes, e.g. `--format`. */
  long: string;
  short: string | null;
  description: string;
  takesValue: boolean;
  /** Stays offered after use; a non-repeatable flag is filtered out once given. */
  repeatable: boolean;
  value: ValueKind;
  choices: string[];
}

export interface CompletionCommand {
  /** Space-joined path, e.g. `ntsb-reports fetch`. The root is the empty string. */
  id: string;
  path: string[];
  description: string;
  subcommands: string[];
  options: CompletionOption[];
  /** What the first positional argument accepts. */
  argument: { kind: ValueKind; choices: string[] };
}

export interface CompletionModel {
  binary: string;
  version: string;
  commands: CompletionCommand[];
}

type Hint = { kind: ValueKind; choices: string[] };

/**
 * Option values a shell can offer, keyed `<command id>|<long flag>`, derived
 * from the same option declarations that registered the commands — so a new
 * choice is completable without anyone editing a table.
 */
function buildHints(): Map<string, Hint> {
  const hints = new Map<string, Hint>();
  const put = (commandId: string, decls: Parameters<typeof completionHints>[0]): void => {
    for (const [long, hint] of completionHints(decls)) hints.set(`${commandId}|${long}`, hint);
  };
  for (const { manifest } of PLUGINS) {
    if (manifest.fetch) {
      put(`${manifest.id} fetch`, [...manifest.fetch.options, ...FETCH_COMMON]);
      put(`${manifest.id} list`, [...manifest.fetch.options, ...LIST_COMMON]);
    }
    if (manifest.query) put(`${manifest.id} query`, [...manifest.query.options, ...QUERY_COMMON]);
  }
  hints.set("cache clear|--solver", { kind: "choice", choices: ["anubis"] });
  return hints;
}

/** Positional arguments whose values are a fixed vocabulary. */
const ARGUMENT_CHOICES: Record<string, string[]> = {
  completion: [...SHELLS],
};

const FILE_NAMES = new Set(["file", "files", "path", "paths", "schema", "config"]);
const DIRECTORY_NAMES = new Set(["dir", "directory", "root", "dest"]);

function valueKind(
  hints: Map<string, Hint>,
  commandId: string,
  long: string,
  valueName: string | null,
): ValueKind {
  if (!valueName) return "none";
  if (long === "--format") return "choice";
  const hint = hints.get(`${commandId}|${long}`);
  if (hint) return hint.kind;
  if (FILE_NAMES.has(valueName)) return "file";
  if (DIRECTORY_NAMES.has(valueName)) return "directory";
  return "free";
}

function choicesFor(hints: Map<string, Hint>, commandId: string, long: string): string[] {
  if (long === "--format") return [...(COMMAND_CONTRACTS[commandId]?.formats ?? [])];
  return hints.get(`${commandId}|${long}`)?.choices ?? [];
}

function describeToCompletion(
  hints: Map<string, Hint>,
  option: DescribedOption,
  commandId: string,
): CompletionOption | null {
  if (!option.long) return null;
  const kind = valueKind(hints, commandId, option.long, option.valueName);
  return {
    long: option.long,
    short: option.short ?? null,
    description: option.description,
    takesValue: option.valueName !== null,
    repeatable: option.repeatable && !option.negated,
    value: kind,
    choices: kind === "choice" ? choicesFor(hints, commandId, option.long) : [],
  };
}

function argumentFor(command: DescribedCommand): { kind: ValueKind; choices: string[] } {
  const choices = ARGUMENT_CHOICES[command.id];
  if (choices) return { kind: "choice", choices };
  const first = command.arguments[0];
  if (!first) return { kind: "none", choices: [] };
  const name = first.name.toLowerCase();
  if (DIRECTORY_NAMES.has(name)) return { kind: "directory", choices: [] };
  if (FILE_NAMES.has(name)) return { kind: "file", choices: [] };
  return { kind: "free", choices: [] };
}

function helpOption(): CompletionOption {
  return {
    long: "--help",
    short: "-h",
    description: "Show help",
    takesValue: false,
    repeatable: false,
    value: "none",
    choices: [],
  };
}

/**
 * Builds the completion model from the same command walk `describe` uses, so a
 * new plugin or option becomes completable without a script edit.
 */
export function buildModel(
  program: Command,
  tool: { name: string; version: string },
): CompletionModel {
  const hints = buildHints();
  const described = walkCommands(program);
  const root: CompletionCommand = {
    id: "",
    path: [],
    description: program.description(),
    subcommands: described
      .filter((command) => command.path.length === 1)
      .map((command) => command.id),
    options: [
      {
        long: "--version",
        short: "-V",
        description: "Show the version",
        takesValue: false,
        repeatable: false,
        value: "none",
        choices: [],
      },
      helpOption(),
    ],
    argument: { kind: "none", choices: [] },
  };
  return {
    binary: program.name(),
    version: tool.version,
    commands: [
      root,
      ...described.map((command) => ({
        id: command.id,
        path: command.path,
        description: command.description,
        subcommands: command.subcommands,
        options: [
          ...command.options
            .map((option) => describeToCompletion(hints, option, command.id))
            .filter((option): option is CompletionOption => option !== null),
          helpOption(),
        ],
        argument: argumentFor(command),
      })),
    ],
  };
}

/** Every command id, root first, in a stable order. */
export function commandIds(model: CompletionModel): string[] {
  return model.commands.map((command) => command.id);
}
