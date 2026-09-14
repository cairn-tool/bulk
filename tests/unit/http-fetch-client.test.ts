import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieJar } from "../../src/http/cookie-jar.js";
import { FetchHttpClient } from "../../src/http/fetch-client.js";
import { HostOverrides } from "../../src/http/hosts.js";
import { LimiterTable, type Clock } from "../../src/http/ratelimit.js";
import { BROWSER_UA, CURL_UA, userAgentFor } from "../../src/http/user-agent.js";

interface Seen {
  url: string;
  method: string;
  headers: Headers;
  body?: string;
}

/** A scripted `fetch`: responses in order, every request recorded. */
function scripted(responses: Array<() => Response>): { fetchImpl: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  let i = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const body = init?.body;
    seen.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body:
        typeof body === "string"
          ? body
          : body instanceof URLSearchParams
            ? body.toString()
            : undefined,
    });
    const make = responses[Math.min(i, responses.length - 1)];
    i++;
    return make();
  }) as typeof fetch;
  return { fetchImpl, seen };
}

const quietClock: Clock = { now: () => 0, sleep: async () => undefined };

describe("userAgentFor", () => {
  it("picks the string for each kind", () => {
    expect(userAgentFor("browser")).toBe(BROWSER_UA);
    expect(userAgentFor("curl")).toBe(CURL_UA);
    expect(userAgentFor("polite", { contact: "me@example.org" })).toMatch(
      /^bulk\/\S+ \(mailto:me@example\.org\)$/,
    );
    expect(userAgentFor("polite")).toMatch(/^bulk\/\S+ \(\+https:\/\//);
  });
});

describe("HostOverrides", () => {
  it("rewrites the host, keeps the path, and reports the original host", () => {
    const overrides = new HostOverrides({ "www.ntsb.gov": "http://127.0.0.1:4310" });
    expect(overrides.rewrite("https://www.ntsb.gov/a/b?c=1")).toEqual({
      url: "http://127.0.0.1:4310/a/b?c=1",
      originalHost: "www.ntsb.gov",
      rewritten: true,
    });
    expect(overrides.rewrite("https://other/x").rewritten).toBe(false);
  });
  it("prefixes a base path and parses BULK_HOSTS", () => {
    const overrides = HostOverrides.fromEnv({ a: "http://x" }, "b=http://y/mirror, c=http://z");
    expect(overrides.rewrite("https://b/p").url).toBe("http://y/mirror/p");
    expect(overrides.size()).toBe(3);
    expect(() => HostOverrides.fromEnv({}, "nonsense")).toThrow(/host=url/);
  });
});

describe("FetchHttpClient", () => {
  let dir: string;
  beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-client-"))));
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("assembles headers from the host policy, the jar, and the caller (caller last)", async () => {
    const { fetchImpl, seen } = scripted([
      () => new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }),
    ]);
    const jar = new CookieJar();
    jar.applySetCookie("https://repository.library.noaa.gov/", ["s=1"]);
    const client = new FetchHttpClient({
      fetchImpl,
      clock: quietClock,
      policies: (host) =>
        host === "repository.library.noaa.gov" ? { userAgent: "curl" } : undefined,
      overrides: new HostOverrides({ "repository.library.noaa.gov": "http://127.0.0.1:1" }),
    });
    const response = await client.request({
      url: "https://repository.library.noaa.gov/fedora/export?rows=1",
      cookieJar: jar,
      headers: { accept: "*/*", "x-extra": "yes" },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(seen[0].url).toBe("http://127.0.0.1:1/fedora/export?rows=1");
    expect(seen[0].headers.get("user-agent")).toBe(CURL_UA);
    expect(seen[0].headers.get("x-bulk-host")).toBe("repository.library.noaa.gov");
    expect(seen[0].headers.get("cookie")).toBe("s=1");
    expect(seen[0].headers.get("x-extra")).toBe("yes");
  });

  it("follows redirects by hand so the jar records every hop's Set-Cookie", async () => {
    const { fetchImpl, seen } = scripted([
      () =>
        new Response(null, {
          status: 302,
          headers: { location: "/next", "set-cookie": "hop=1; Path=/" },
        }),
      () => new Response("done", { status: 200, headers: { "set-cookie": "final=2; Path=/" } }),
    ]);
    const jar = new CookieJar();
    const client = new FetchHttpClient({ fetchImpl, clock: quietClock });
    const response = await client.request({
      url: "https://h/start",
      method: "POST",
      body: "x",
      cookieJar: jar,
    });
    expect(response.url).toBe("https://h/next");
    expect(seen.map((s) => s.method)).toEqual(["POST", "GET"]);
    expect(seen[1].headers.get("cookie")).toBe("hop=1");
    expect(jar.headerFor("https://h/")).toBe("hop=1; final=2");
  });

  it("re-sends a 429 after Retry-After and records the wait", async () => {
    const { fetchImpl, seen } = scripted([
      () => new Response("slow down", { status: 429, headers: { "retry-after": "3" } }),
      () => new Response("ok", { status: 200 }),
    ]);
    const clock = {
      now: () => 0,
      slept: [] as number[],
      sleep: async (s: number) => void clock.slept.push(s),
    };
    const limiters = new LimiterTable({}, clock);
    const client = new FetchHttpClient({ fetchImpl, clock, limiters });
    const response = await client.request({ url: "https://api/x" });
    expect(response.status).toBe(200);
    expect(seen).toHaveLength(2);
    expect(clock.slept).toEqual([3]);
    expect(client.limits()[0]).toMatchObject({ host: "api", source: "HTTP 429 with Retry-After" });
  });

  it("form-encodes URLSearchParams bodies and sends JSON strings verbatim", async () => {
    const { fetchImpl, seen } = scripted([() => new Response("ok")]);
    const client = new FetchHttpClient({ fetchImpl, clock: quietClock });
    await client.request({
      url: "https://h/form",
      method: "POST",
      body: new URLSearchParams({ a: "1 2" }),
    });
    expect(seen[0].body).toBe("a=1+2");
    expect(seen[0].headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    await client.request({
      url: "https://h/json",
      method: "POST",
      body: '{"a":1}',
      headers: { "content-type": "application/json" },
    });
    expect(seen[1].body).toBe('{"a":1}');
  });

  it("streams a download to the file, hashing and reporting progress", async () => {
    const payload = "%PDF-1.4\n" + "z".repeat(5000);
    const { fetchImpl } = scripted([
      () => new Response(payload, { status: 200, headers: { "content-type": "application/pdf" } }),
    ]);
    const client = new FetchHttpClient({ fetchImpl, clock: quietClock });
    const file = path.join(dir, "x.pdf.part");
    const progress: number[] = [];
    const result = await client.download({
      url: "https://h/x.pdf",
      toFile: file,
      onProgress: (n) => progress.push(n),
      digest: "sha1",
    });
    expect(result.bytes).toBe(payload.length);
    expect(fs.readFileSync(file, "utf-8")).toBe(payload);
    expect(new TextDecoder().decode(result.head)).toBe("%PDF-1.4");
    expect(result.sha256).toHaveLength(64);
    expect(result.digest).toHaveLength(40);
    expect(progress.at(-1)).toBe(payload.length);
  });

  it("resolves a redirect chain without transferring the body", async () => {
    const { fetchImpl, seen } = scripted([
      () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://nvlpubs.nist.gov/x.pdf" },
        }),
      () => new Response("body", { status: 206 }),
    ]);
    const client = new FetchHttpClient({ fetchImpl, clock: quietClock });
    expect(await client.resolve("https://doi.org/10.6028/NIST.SP.800-53r5")).toBe(
      "https://nvlpubs.nist.gov/x.pdf",
    );
    expect(seen[0].headers.get("range")).toBe("bytes=0-0");
  });

  it("wraps a transport failure in an HttpError naming the host", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const client = new FetchHttpClient({ fetchImpl, clock: quietClock });
    await expect(client.request({ url: "https://down.example/x" })).rejects.toThrow(
      "down.example: fetch failed",
    );
  });
});
