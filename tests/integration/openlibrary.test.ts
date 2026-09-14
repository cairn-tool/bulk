import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildQueryContext } from "../../src/plugin/context.js";
import { plugin } from "../../src/plugins/openlibrary/index.js";
import { QueryCache } from "../../src/query/cache.js";
import { resolveKeys } from "../../src/query/resolve.js";
import { startSourceServer, type SourceServer } from "../helpers/source-server.js";
import { tempEnv, testRuntime } from "../helpers/env.js";

let server: SourceServer;
let env: ReturnType<typeof tempEnv>;
beforeAll(async () => (server = await startSourceServer({ hosts: ["openlibrary.org"] })));
afterAll(() => server.close());
beforeEach(() => (env = tempEnv()));
afterEach(() => env.cleanup());

describe("openlibrary against the fixture server", () => {
  it("looks up a batch, caches hits and misses, and re-runs from the cache", async () => {
    const runtime = testRuntime({
      hosts: server.hosts,
      cacheDir: path.join(env.dir, "cache"),
      config: { contact: "me@example.org" } as never,
    });
    const { ctx, jars } = buildQueryContext({
      pluginId: "openlibrary",
      runtime,
      stream: { write: () => undefined, isTTY: false },
      quiet: true,
      delay: 0,
    });
    const cacheFile = path.join(env.dir, "ol.json");
    const service = plugin.query!;
    const keys = ["9780262033848", "0071449590", "9780000000002"].map((k) =>
      service.normalize(k, {} as never)!,
    );
    expect(keys).toEqual(["9780262033848", "9780071449595", "9780000000002"]);
    const before = server.requests.length;
    const results = await resolveKeys(keys, (batch) => service.lookup(batch, ctx, {} as never), {
      cache: new QueryCache(cacheFile),
      batchSize: 20,
    });
    expect(server.requests.length - before).toBe(1);
    expect(server.requests.at(-1)!.url).toContain(
      "bibkeys=ISBN:9780262033848,ISBN:9780071449595,ISBN:9780000000002",
    );
    expect(server.requests.at(-1)!.headers["user-agent"]).toMatch(/mailto:me@example\.org/);
    expect(results["9780262033848"]).toMatchObject({
      title: "Introduction to Algorithms",
      authors: ["Thomas H. Cormen", "Charles E. Leiserson"],
      pages: 1312,
    });
    expect(results["9780000000002"]).toBeNull();
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    expect(Object.keys(cached).sort()).toEqual(keys.slice().sort());
    const again = await resolveKeys(keys, (batch) => service.lookup(batch, ctx, {} as never), {
      cache: new QueryCache(cacheFile),
      batchSize: 20,
    });
    expect(server.requests.length - before).toBe(1);
    expect(again["9780071449595"]).toMatchObject({ subtitle: "A Self-Teaching Guide" });
    jars.close();
  });
});
