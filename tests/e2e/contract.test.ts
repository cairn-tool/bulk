import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { COMMAND_CONTRACTS } from "../../src/contract/registry.js";
import { SCHEMAS, SCHEMA_BY_ID } from "../../src/contract/schemas/index.js";
import { PLUGINS } from "../../src/plugins/index.js";
import { runCli } from "../helpers/cli.js";

interface Described {
  id: string;
  subcommands: string[];
  stability: string;
  outputSchema: string | null;
}

/** Group nodes that carry no contract of their own. */
const GROUPS = new Set(["cache", "config", ...PLUGINS.map((p) => p.manifest.id)]);

describe("contract", () => {
  it("declares every visible command, and every declared command exists", async () => {
    const { stdout, exitCode } = await runCli(["describe", "-fj"]);
    expect(exitCode).toBe(0);
    const commands = JSON.parse(stdout).commands as Described[];
    const undeclared = commands
      .filter((c) => c.stability === "undeclared" && !GROUPS.has(c.id))
      .map((c) => c.id);
    expect(undeclared).toEqual([]);
    const ids = new Set(commands.map((c) => c.id));
    const dangling = Object.keys(COMMAND_CONTRACTS).filter((id) => !ids.has(id));
    expect(dangling).toEqual([]);
  });

  it("publishes a schema for every outputSchema the registry names", () => {
    for (const contract of Object.values(COMMAND_CONTRACTS))
      if (contract.outputSchema) expect(SCHEMA_BY_ID.has(contract.outputSchema)).toBe(true);
    for (const entry of SCHEMAS) expect(entry.schema.$id).toBe(entry.uri);
  });

  it("validates the describe and sources payloads against their schemas", async () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    (addFormats as unknown as (a: Ajv2020) => void)(ajv);
    for (const [args, id] of [
      [["describe", "-fj"], "describe"],
      [["sources", "-fj"], "sources"],
      [["cache", "limits", "-fj"], "cache-limits"],
      [["config", "show", "-fj"], "config"],
    ] as const) {
      const { stdout } = await runCli([...args]);
      const validate = ajv.compile(SCHEMA_BY_ID.get(id)!.schema);
      expect(
        validate(JSON.parse(stdout)),
        `${args.join(" ")}: ${JSON.stringify(validate.errors)}`,
      ).toBe(true);
    }
  });

  it("serves every schema by id", async () => {
    const index = await runCli(["schema", "-fj"]);
    expect(JSON.parse(index.stdout).schemas.map((s: { id: string }) => s.id)).toEqual(
      SCHEMAS.map((s) => s.id),
    );
    const one = await runCli(["schema", "fetch-result"]);
    expect(JSON.parse(one.stdout).$id).toContain("fetch-result");
    const bad = await runCli(["schema", "nope"]);
    expect(bad.exitCode).toBe(1);
  });
});
