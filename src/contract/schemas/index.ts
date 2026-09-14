import type { JsonSchema, SchemaEntry } from "../types.js";
import { schemaUri } from "../version.js";

/**
 * The published output schemas. Rules: no schema sets `additionalProperties:
 * false` (an additive change must not break a validating consumer) and none
 * `$ref`s another document (`bulk schema <id>` must return something that
 * compiles alone). `tests/unit/contract-schemas.test.ts` enforces both.
 */

const string = { type: "string" } as const;
const integer = { type: "integer" } as const;
const number = { type: "number" } as const;
const boolean = { type: "boolean" } as const;
const nullableString = { type: ["string", "null"] } as const;
const nullableInteger = { type: ["integer", "null"] } as const;

const outcome: JsonSchema = {
  type: "object",
  properties: {
    ok: integer,
    skip: integer,
    fail: integer,
    bytes: integer,
    interrupted: boolean,
    seconds: number,
    logPath: string,
    failures: {
      type: "array",
      items: {
        type: "object",
        properties: { dest: string, note: string, http: integer },
        required: ["dest", "note"],
      },
    },
  },
  required: ["ok", "skip", "fail", "bytes", "interrupted", "seconds"],
};

const fetchResult: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "fetch-result"),
  title: "Fetch result",
  type: "object",
  properties: {
    plugin: string,
    dest: string,
    manifest: string,
    dryRun: boolean,
    planned: integer,
    summary: { type: "array", items: string },
    warnings: { type: "array", items: string },
    outcome: { ...outcome, type: ["object", "null"] },
  },
  required: ["plugin", "dest", "planned", "summary"],
};

const listResult: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "list-result"),
  title: "Catalogue listing",
  type: "object",
  properties: {
    plugin: string,
    count: integer,
    summary: { type: "array", items: string },
    warnings: { type: "array", items: string },
    rows: { type: "array", items: { type: "object" } },
  },
  required: ["plugin", "count", "rows"],
};

const queryResult: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "query-result"),
  title: "Query result",
  type: "object",
  properties: {
    plugin: string,
    total: integer,
    found: integer,
    skipped: { type: "array", items: string },
    results: {
      type: "object",
      additionalProperties: { type: ["object", "null"] },
    },
  },
  required: ["plugin", "total", "found", "results"],
};

const sources: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "sources"),
  title: "Registered plugins",
  type: "object",
  properties: {
    count: integer,
    plugins: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: string,
          name: string,
          summary: string,
          commands: { type: "array", items: string },
          hosts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                host: string,
                userAgent: string,
                minInterval: number,
                challenge: string,
                note: string,
              },
              required: ["host", "userAgent"],
            },
          },
        },
        required: ["id", "name", "summary", "commands", "hosts"],
      },
    },
  },
  required: ["count", "plugins"],
};

const cacheList: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "cache-list"),
  title: "Cached challenge cookies",
  type: "object",
  properties: {
    cacheDir: string,
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          solver: string,
          host: string,
          state: { type: "string", enum: ["valid", "expiring", "expired", "none"] },
          expires: nullableString,
          file: string,
          bytes: integer,
        },
        required: ["solver", "host", "state", "file", "bytes"],
      },
    },
  },
  required: ["cacheDir", "entries"],
};

const cacheLimits: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "cache-limits"),
  title: "Per-host rate limits",
  type: "object",
  properties: {
    declared: { type: "object", additionalProperties: number },
    inForce: {
      type: "array",
      items: {
        type: "object",
        properties: {
          host: string,
          interval: number,
          limit: nullableInteger,
          window: { type: ["number", "null"] },
          remaining: nullableInteger,
          source: string,
          waiting: number,
        },
        required: ["host", "interval", "source", "waiting"],
      },
    },
  },
  required: ["declared", "inForce"],
};

const checkUpdate: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "check-update"),
  title: "Update check",
  type: "object",
  properties: {
    current: string,
    latest: nullableString,
    updateAvailable: boolean,
    error: string,
  },
  required: ["current", "latest", "updateAvailable"],
};

const describe: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "describe"),
  title: "CLI contract description",
  type: "object",
  properties: {
    schemaVersion: string,
    tool: {
      type: "object",
      properties: { name: string, version: string },
      required: ["name", "version"],
    },
    formatShorthands: { type: "object", additionalProperties: string },
    environment: {
      type: "array",
      items: {
        type: "object",
        properties: { name: string, meaning: string },
        required: ["name", "meaning"],
      },
    },
    machineStreams: { type: "object" },
    schemas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: string,
          uri: string,
          title: string,
          commands: { type: "array", items: string },
        },
        required: ["id", "uri", "title", "commands"],
      },
    },
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: string,
          path: { type: "array", items: string },
          description: string,
          usage: string,
          arguments: { type: "array" },
          options: { type: "array" },
          subcommands: { type: "array", items: string },
          formats: { type: ["array", "null"], items: string },
          defaultFormat: nullableString,
          formatConfigurable: boolean,
          outputSchema: nullableString,
          exitCodes: {
            type: "array",
            items: {
              type: "object",
              properties: { code: { type: "integer", enum: [0, 1, 2, 130] }, meaning: string },
              required: ["code", "meaning"],
            },
          },
          stream: { type: ["object", "null"] },
          writes: { type: ["boolean", "null"] },
          network: { type: ["boolean", "null"] },
          stability: { type: "string", enum: ["stable", "experimental", "undeclared"] },
          notes: string,
        },
        required: [
          "id",
          "path",
          "description",
          "usage",
          "arguments",
          "options",
          "subcommands",
          "exitCodes",
          "stability",
        ],
      },
    },
  },
  required: ["schemaVersion", "tool", "formatShorthands", "schemas", "commands"],
};

const configResult: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: schemaUri("v1", "config"),
  title: "Resolved configuration",
  type: "object",
  properties: {
    configPath: nullableString,
    exists: boolean,
    cacheDir: string,
    archive: nullableString,
    contact: nullableString,
    delay: number,
    output: { type: "object" },
    hosts: { type: "object" },
    limits: { type: "object" },
    plugins: { type: "object" },
    query: { type: "object" },
    challenge: { type: "object" },
  },
  required: ["exists", "cacheDir", "delay"],
};

export const SCHEMAS: readonly SchemaEntry[] = [
  {
    id: "fetch-result",
    uri: schemaUri("v1", "fetch-result"),
    title: "Fetch result",
    commands: ["<plugin> fetch"],
    schema: fetchResult,
  },
  {
    id: "list-result",
    uri: schemaUri("v1", "list-result"),
    title: "Catalogue listing",
    commands: ["<plugin> list"],
    schema: listResult,
  },
  {
    id: "query-result",
    uri: schemaUri("v1", "query-result"),
    title: "Query result",
    commands: ["<plugin> query"],
    schema: queryResult,
  },
  {
    id: "sources",
    uri: schemaUri("v1", "sources"),
    title: "Registered plugins",
    commands: ["sources"],
    schema: sources,
  },
  {
    id: "cache-list",
    uri: schemaUri("v1", "cache-list"),
    title: "Cached challenge cookies",
    commands: ["cache list"],
    schema: cacheList,
  },
  {
    id: "cache-limits",
    uri: schemaUri("v1", "cache-limits"),
    title: "Per-host rate limits",
    commands: ["cache limits"],
    schema: cacheLimits,
  },
  {
    id: "check-update",
    uri: schemaUri("v1", "check-update"),
    title: "Update check",
    commands: ["check-update"],
    schema: checkUpdate,
  },
  {
    id: "describe",
    uri: schemaUri("v1", "describe"),
    title: "CLI contract description",
    commands: ["describe"],
    schema: describe,
  },
  {
    id: "config",
    uri: schemaUri("v1", "config"),
    title: "Resolved configuration",
    commands: ["config show"],
    schema: configResult,
  },
];

export const SCHEMA_BY_ID: ReadonlyMap<string, SchemaEntry> = new Map(
  SCHEMAS.map((entry) => [entry.id, entry]),
);

export function schemaUriFor(id: string | null | undefined): string | null {
  if (!id) return null;
  return SCHEMA_BY_ID.get(id)?.uri ?? null;
}
