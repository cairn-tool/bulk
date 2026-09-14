import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { collect } from "../../src/option-utils.js";
import {
  applyOptions,
  camel,
  coerceOptions,
  completionHints,
  optionsToJsonSchema,
} from "../../src/plugin/options.js";
import type { OptionDecl } from "../../src/plugin/types.js";

const decls: OptionDecl[] = [
  { kind: "boolean", name: "dry-run", description: "plan" },
  {
    kind: "string",
    name: "mode",
    value: "m",
    description: "mode",
    choices: ["a", "b"],
    repeatable: true,
  },
  {
    kind: "string",
    name: "order",
    value: "o",
    description: "order",
    choices: ["asc", "desc"],
    default: "desc",
  },
  { kind: "integer", name: "limit", value: "n", description: "limit", min: 0, max: 10 },
  { kind: "number", name: "min-score", value: "f", description: "score", default: 0.6 },
  { kind: "tuple", name: "added", values: ["from", "to"], description: "range" },
  { kind: "string", name: "list-file", value: "file", description: "file", complete: "file" },
];

describe("option declarations", () => {
  it("registers with commander, repeatable ones through collect by identity", () => {
    const command = new Command("x");
    applyOptions(command, decls);
    const mode = command.options.find((o) => o.long === "--mode")!;
    expect(mode.parseArg).toBe(collect);
    expect(mode.description).toBe("mode (a, b)");
    expect(command.options.find((o) => o.long === "--added")!.variadic).toBe(true);
    command.parse(
      ["--mode", "a", "--mode", "b", "--limit", "3", "--added", "1", "2", "--dry-run"],
      { from: "user" },
    );
    expect(command.opts()).toMatchObject({
      mode: ["a", "b"],
      limit: "3",
      added: ["1", "2"],
      dryRun: true,
    });
  });

  it("coerces, defaults, and validates the parsed values", () => {
    const opts = coerceOptions(
      decls,
      { mode: ["a"], limit: "3", added: ["1", "2"] },
      { minScore: 0.9 },
    );
    expect(opts).toEqual({
      mode: ["a"],
      limit: 3,
      added: ["1", "2"],
      dryRun: false,
      order: "desc",
      minScore: 0.9,
    });
    expect(() => coerceOptions(decls, { mode: ["c"] })).toThrow(
      "--mode must be one of a, b (got c)",
    );
    expect(() => coerceOptions(decls, { limit: "11" })).toThrow("--limit must be <= 10");
    expect(() => coerceOptions(decls, { limit: "1.5" })).toThrow("--limit must be an integer");
    expect(() => coerceOptions(decls, { added: ["1"] })).toThrow("--added takes 2 values: from to");
    expect(() => coerceOptions(decls, { minScore: "x" })).toThrow("--min-score must be a number");
  });

  it("builds a JSON schema and completion hints from the same declarations", () => {
    const schema = optionsToJsonSchema(decls) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(schema.properties.mode).toEqual({
      type: "array",
      items: { type: "string", description: "mode", enum: ["a", "b"] },
      description: "mode",
    });
    expect(schema.properties.limit).toEqual({
      type: "integer",
      description: "limit",
      minimum: 0,
      maximum: 10,
    });
    expect(schema.properties.added).toMatchObject({ type: "array", minItems: 2, maxItems: 2 });
    const hints = completionHints(decls);
    expect(hints.get("--mode")).toEqual({ kind: "choice", choices: ["a", "b"] });
    expect(hints.get("--list-file")).toEqual({ kind: "file", choices: [] });
    expect(hints.get("--dry-run")).toEqual({ kind: "none", choices: [] });
    expect(camel("list-file")).toBe("listFile");
  });
});
