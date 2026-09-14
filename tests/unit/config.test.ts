import { describe, expect, it } from "vitest";
import { defaultConfig, parseConfig, templateConfig } from "../../src/config.js";
import { archiveFromEnv, cacheDir, configPath } from "../../src/paths.js";

const env = { HOME: "/home/u" } as NodeJS.ProcessEnv;

describe("paths", () => {
  it("resolves the config and cache from XDG, then the explicit variables", () => {
    expect(configPath({ env, homedir: "/home/u" })).toBe("/home/u/.config/bulk/config.yml");
    expect(cacheDir({ env, homedir: "/home/u" })).toBe("/home/u/.cache/bulk");
    expect(configPath({ env: { ...env, XDG_CONFIG_HOME: "/x" }, homedir: "/home/u" })).toBe(
      "/x/bulk/config.yml",
    );
    expect(cacheDir({ env: { ...env, XDG_CACHE_HOME: "/c" }, homedir: "/home/u" })).toBe("/c/bulk");
    expect(
      configPath({ env: { ...env, BULK_CONFIG: "/etc/bulk.yml", XDG_CONFIG_HOME: "/x" } }),
    ).toBe("/etc/bulk.yml");
    expect(cacheDir({ env: { ...env, BULK_CACHE: "/tmp/bc" } })).toBe("/tmp/bc");
    expect(archiveFromEnv({ BULK_ARCHIVE: " /archive " } as NodeJS.ProcessEnv)).toBe("/archive");
    expect(archiveFromEnv({} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});

describe("parseConfig", () => {
  it("fills defaults for an empty file", () => {
    const config = parseConfig("", { env, homedir: "/home/u" });
    expect(config).toMatchObject({
      delay: 2,
      query: { delay: 0.5 },
      output: { format: "llm" },
      plugins: {},
      hosts: {},
      limits: {},
    });
    expect(config.archive).toBeUndefined();
    expect(config.challenge.anubis).toEqual({ enabled: true, refreshMargin: 600, delay: 1 });
  });

  it("reads every key and lets the environment win for archive and contact", () => {
    const text = [
      "version: 1",
      "archive: /vol/archive",
      "contact: me@example.org",
      "delay: 1.5",
      "output: { format: json }",
      "hosts: { www.ntsb.gov: http://127.0.0.1:1 }",
      "limits: { export.arxiv.org: 0 }",
      "plugins:",
      "  ntsb-reports: { dest: ntsb/reports, delay: 0.5, options: { mode: [Aviation] } }",
      "  openlibrary: { cache: true }",
      "  crossref: { cache: /tmp/c.json }",
      "query: { delay: 0.1 }",
      "challenge: { anubis: { enabled: false, refreshMargin: 30 } }",
    ].join("\n");
    const config = parseConfig(text, {
      env: { ...env, BULK_ARCHIVE: "/env/archive", BULK_CONTACT: "env@example.org" },
      homedir: "/home/u",
    });
    expect(config.archive).toBe("/env/archive");
    expect(config.contact).toBe("env@example.org");
    expect(config.delay).toBe(1.5);
    expect(config.output.format).toBe("json");
    expect(config.hosts).toEqual({ "www.ntsb.gov": "http://127.0.0.1:1" });
    expect(config.limits).toEqual({ "export.arxiv.org": 0 });
    expect(config.plugins["ntsb-reports"]).toEqual({
      dest: "ntsb/reports",
      delay: 0.5,
      cache: undefined,
      options: { mode: ["Aviation"] },
    });
    expect(config.plugins.openlibrary.cache).toBe(true);
    expect(config.plugins.crossref.cache).toBe("/tmp/c.json");
    expect(config.query.delay).toBe(0.1);
    expect(config.challenge.anubis).toEqual({ enabled: false, refreshMargin: 30, delay: 1 });
    const fromFile = parseConfig("archive: /vol/archive\ncontact: file@example.org\n", {
      env,
      homedir: "/home/u",
    });
    expect(fromFile.archive).toBe("/vol/archive");
    expect(fromFile.contact).toBe("file@example.org");
  });

  it.each([
    ["nonsense: 1", /Unknown config key: nonsense/],
    ["version: 2", /Unsupported config version/],
    ["plugins: { x: { dets: y } }", /Unknown plugins.x key: dets/],
    ["plugins: { x: { cache: 3 } }", /plugins.x.cache must be/],
    ["output: { format: yaml }", /output.format must be one of/],
    ["delay: -1", /delay must be a number/],
    ["hosts: { a: 1 }", /hosts.a must be a string/],
    ["- a", /config must be a mapping/],
  ])("rejects %s", (text, message) => {
    expect(() => parseConfig(text, { env, homedir: "/home/u" })).toThrow(message);
  });

  it("ships a template that parses to the defaults", () => {
    const config = parseConfig(templateConfig(), { env, homedir: "/home/u" });
    expect(config.delay).toBe(defaultConfig({ env, homedir: "/home/u" }).delay);
    expect(config.plugins).toEqual({});
  });
});
