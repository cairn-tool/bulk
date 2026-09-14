import { Command, Option } from "commander";
import { collect } from "../option-utils.js";
import type { OptionDecl } from "./types.js";

export function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** The common options every `fetch` command has; the plugin adds its own selection options. */
export const FETCH_COMMON: readonly OptionDecl[] = [
  {
    kind: "string",
    name: "dest",
    value: "dir",
    description: "Download root (required unless plugins.<id>.dest is configured)",
    complete: "directory",
  },
  {
    kind: "number",
    name: "delay",
    value: "s",
    description: "Seconds between downloads (default from config, 2)",
    min: 0,
  },
  {
    kind: "integer",
    name: "limit",
    value: "n",
    description: "Stop after N items (default: all)",
    min: 0,
  },
  {
    kind: "string",
    name: "list-file",
    value: "file",
    description: "Use a saved catalogue response instead of fetching it",
    complete: "file",
  },
  {
    kind: "boolean",
    name: "dry-run",
    description: "Build the manifest and print the plan; download nothing",
  },
];

/** The common options of `list`: the selection options plus these. */
export const LIST_COMMON: readonly OptionDecl[] = [
  {
    kind: "number",
    name: "delay",
    value: "s",
    description: "Seconds between catalogue requests",
    min: 0,
  },
  {
    kind: "integer",
    name: "limit",
    value: "n",
    description: "Stop after N rows (default: all)",
    min: 0,
  },
  {
    kind: "string",
    name: "list-file",
    value: "file",
    description: "Use a saved catalogue response instead of fetching it",
    complete: "file",
  },
  {
    kind: "string",
    name: "tsv",
    value: "file",
    description: "Write the rows to this TSV instead of printing them",
  },
];

/** The common options every `query` command has. */
export const QUERY_COMMON: readonly OptionDecl[] = [
  {
    kind: "string",
    name: "from",
    value: "file",
    description: "Read keys from FILE, one per line",
    complete: "file",
  },
  {
    kind: "string",
    name: "cache",
    value: "file",
    description: "JSON cache of answers (default: plugins.<id>.cache)",
    complete: "file",
  },
  { kind: "boolean", name: "no-cache", description: "Neither read nor write a cache" },
  { kind: "boolean", name: "refresh", description: "Ask again even for keys the cache has" },
  {
    kind: "number",
    name: "delay",
    value: "s",
    description: "Seconds between requests (default 0.5)",
    min: 0,
  },
  { kind: "string", name: "tsv", value: "file", description: "Write the records to this TSV" },
];

export function flagsOf(decl: OptionDecl): string {
  switch (decl.kind) {
    case "boolean":
      return `--${decl.name}`;
    case "tuple":
      return `--${decl.name} <${decl.values.join("> <")}>`;
    default:
      return `--${decl.name} <${decl.value}${decl.repeatable ? "..." : ""}>`.replace("...>", ">");
  }
}

function describeWithChoices(decl: OptionDecl): string {
  if ("choices" in decl && decl.choices?.length)
    return `${decl.description} (${decl.choices.join(", ")})`;
  return decl.description;
}

/**
 * Registers declarations on a commander command. Repeatable options accumulate
 * through `collect` — by identity, which is how `describe` detects them.
 * Values are validated after parsing by `coerceOptions`, not here, so the
 * error message is one string wherever the option appears.
 */
export function applyOptions(command: Command, decls: readonly OptionDecl[]): Command {
  for (const decl of decls) {
    const flags = flagsOf(decl);
    if (decl.kind === "boolean") {
      command.option(flags, decl.description);
      continue;
    }
    if (decl.kind === "tuple") {
      const option = new Option(`--${decl.name} <${decl.values.join("> <")}>`, decl.description);
      option.variadic = true;
      command.addOption(option);
      continue;
    }
    if (decl.repeatable) command.option(flags, describeWithChoices(decl), collect);
    else if (decl.kind === "string" && decl.required)
      command.requiredOption(flags, describeWithChoices(decl));
    else command.option(flags, describeWithChoices(decl));
  }
  return command;
}

/**
 * Turns commander's raw values into typed, validated options: defaults filled,
 * choices and bounds enforced, tuples checked for arity. Throws a plain Error
 * (exit 1) naming the flag.
 */
export function coerceOptions<T extends Record<string, unknown>>(
  decls: readonly OptionDecl[],
  raw: Record<string, unknown>,
  configured: Record<string, unknown> = {},
): T {
  const out: Record<string, unknown> = { ...raw };
  for (const decl of decls) {
    const key = camel(decl.name);
    let value = raw[key];
    if (value === undefined && configured[key] !== undefined) value = configured[key];
    if (value === undefined && "default" in decl && decl.default !== undefined)
      value = decl.default;
    if (value === undefined) {
      if (decl.kind === "boolean") out[key] = false;
      continue;
    }
    switch (decl.kind) {
      case "boolean":
        out[key] = Boolean(value);
        break;
      case "string": {
        const values = decl.repeatable ? (Array.isArray(value) ? value : [value]) : [value];
        for (const v of values) {
          if (typeof v !== "string") throw new Error(`--${decl.name} must be a string`);
          if (decl.choices && !decl.choices.includes(v))
            throw new Error(`--${decl.name} must be one of ${decl.choices.join(", ")} (got ${v})`);
        }
        out[key] = decl.repeatable ? values : values[0];
        break;
      }
      case "integer":
      case "number": {
        const values = decl.repeatable ? (Array.isArray(value) ? value : [value]) : [value];
        const parsed = values.map((v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || (decl.kind === "integer" && !Number.isInteger(n)))
            throw new Error(
              `--${decl.name} must be ${decl.kind === "integer" ? "an integer" : "a number"} (got ${String(v)})`,
            );
          if (decl.min !== undefined && n < decl.min)
            throw new Error(`--${decl.name} must be >= ${decl.min}`);
          if (decl.max !== undefined && n > decl.max)
            throw new Error(`--${decl.name} must be <= ${decl.max}`);
          return n;
        });
        out[key] = decl.repeatable ? parsed : parsed[0];
        break;
      }
      case "tuple": {
        const values = Array.isArray(value) ? value : [value];
        if (values.length !== decl.values.length)
          throw new Error(
            `--${decl.name} takes ${decl.values.length} values: ${decl.values.join(" ")}`,
          );
        out[key] = values.map(String);
        break;
      }
    }
  }
  return out as T;
}

/** A JSON Schema object for an MCP tool's input, one property per declaration. */
export function optionsToJsonSchema(decls: readonly OptionDecl[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const decl of decls) {
    const key = camel(decl.name);
    switch (decl.kind) {
      case "boolean":
        properties[key] = { type: "boolean", description: decl.description };
        break;
      case "string": {
        const one: Record<string, unknown> = { type: "string", description: decl.description };
        if (decl.choices) one.enum = [...decl.choices];
        properties[key] = decl.repeatable
          ? { type: "array", items: one, description: decl.description }
          : one;
        break;
      }
      case "integer":
      case "number": {
        const one: Record<string, unknown> = { type: decl.kind, description: decl.description };
        if (decl.min !== undefined) one.minimum = decl.min;
        if (decl.max !== undefined) one.maximum = decl.max;
        properties[key] = decl.repeatable
          ? { type: "array", items: one, description: decl.description }
          : one;
        break;
      }
      case "tuple":
        properties[key] = {
          type: "array",
          items: { type: "string" },
          minItems: decl.values.length,
          maxItems: decl.values.length,
          description: `${decl.description} (${decl.values.join(", ")})`,
        };
        break;
    }
  }
  return { type: "object", properties, additionalProperties: false };
}

/** What a shell should offer after each option, for completion. */
export function completionHints(
  decls: readonly OptionDecl[],
): Map<string, { kind: "choice" | "file" | "directory" | "free" | "none"; choices: string[] }> {
  const hints = new Map<
    string,
    { kind: "choice" | "file" | "directory" | "free" | "none"; choices: string[] }
  >();
  for (const decl of decls) {
    const long = `--${decl.name}`;
    if (decl.kind === "boolean") hints.set(long, { kind: "none", choices: [] });
    else if (decl.kind === "string" && decl.choices)
      hints.set(long, { kind: "choice", choices: [...decl.choices] });
    else if (decl.kind === "string" && decl.complete)
      hints.set(long, { kind: decl.complete, choices: [] });
    else hints.set(long, { kind: "free", choices: [] });
  }
  return hints;
}
