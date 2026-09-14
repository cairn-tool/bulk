import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../helpers/cli.js";
import { tempEnv } from "../helpers/env.js";

let env: ReturnType<typeof tempEnv>;
beforeEach(() => (env = tempEnv()));
afterEach(() => env.cleanup());

describe("bulk cache", () => {
  it("prints the path, lists and clears cookies, and reports the declared limits", async () => {
    const cache = env.env.BULK_CACHE!;
    expect((await runCli(["cache", "path"], { env: env.env })).stdout.trim()).toBe(cache);
    const empty = await runCli(["cache", "list"], { env: env.env });
    expect(empty.stdout).toContain("no cached cookies");
    fs.mkdirSync(path.join(cache, "anubis"), { recursive: true });
    fs.writeFileSync(
      path.join(cache, "anubis", "cds.cern.ch.jar"),
      "# Netscape HTTP Cookie File\n.cds.cern.ch\tTRUE\t/\tTRUE\t4102444800\ttecharo.lol-anubis-auth-x\tjwt\n",
    );
    const listed = await runCli(["cache", "list", "-fj"], { env: env.env });
    expect(JSON.parse(listed.stdout).entries).toMatchObject([
      { solver: "anubis", host: "cds.cern.ch", state: "valid" },
    ]);
    const cleared = await runCli(["cache", "clear", "--host", "cds.cern.ch"], { env: env.env });
    expect(cleared.stdout).toContain("cleared anubis cookie for cds.cern.ch");
    expect(fs.existsSync(path.join(cache, "anubis", "cds.cern.ch.jar"))).toBe(false);
    const limits = await runCli(["cache", "limits", "-fj"], { env: env.env });
    expect(JSON.parse(limits.stdout).declared).toMatchObject({ "export.arxiv.org": 3 });
    const text = await runCli(["cache", "limits"], { env: env.env });
    expect(text.stdout).toContain("export.arxiv.org");
    expect(text.stdout).toContain("nothing learned this process");
  });
});

describe("bulk config", () => {
  it("prints the path, shows defaults, writes a starter file once, and then shows it", async () => {
    const file = env.env.BULK_CONFIG!;
    expect((await runCli(["config", "path"], { env: env.env })).stdout).toContain("(not present)");
    const show = await runCli(["config", "show", "-fj"], { env: env.env });
    expect(JSON.parse(show.stdout)).toMatchObject({ exists: false, delay: 2, archive: null });
    const init = await runCli(["config", "init"], { env: env.env });
    expect(init.stdout).toBe(`wrote ${file}\n`);
    expect(fs.readFileSync(file, "utf-8")).toContain("version: 1");
    expect((await runCli(["config", "init"], { env: env.env })).stdout).toBe(
      `already present: ${file}\n`,
    );
    fs.appendFileSync(file, "archive: /vol/a\nlimits: { export.arxiv.org: 0 }\n");
    const again = await runCli(["config", "show"], { env: env.env });
    expect(again.stdout).toContain("archive  /vol/a");
    expect(
      JSON.parse((await runCli(["cache", "limits", "-fj"], { env: env.env })).stdout).declared[
        "export.arxiv.org"
      ],
    ).toBe(0);
  });
});
