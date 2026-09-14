import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnubisSolver } from "../../src/challenge/anubis.js";
import { allEntries, clearAll, solver } from "../../src/challenge/registry.js";
import { FakeHttpClient } from "../../src/http/fake-client.js";

let dir: string;
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-anubis-"))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const page = (difficulty: number) =>
  `<html><title>Making sure you're not a bot!</title><body><script id="anubis_challenge" type="application/json">${JSON.stringify({ rules: { algorithm: "fast", difficulty }, challenge: { id: "c1", randomData: "seed" } })}</script></body></html>`;

describe("AnubisSolver", () => {
  it("detects the challenge page and parses it", () => {
    const s = new AnubisSolver(dir);
    expect(s.detect(page(1))).toBe(true);
    expect(s.detect("<html>a document</html>")).toBe(false);
    expect(AnubisSolver.parseChallenge(page(2))).toMatchObject({
      rules: { difficulty: 2 },
      challenge: { id: "c1" },
    });
  });

  it("finds a proof of work with the required leading zeros", () => {
    const { nonce, hash } = AnubisSolver.proofOfWork("seed", 2);
    expect(hash.startsWith("00")).toBe(true);
    expect(nonce).toBeGreaterThanOrEqual(0);
  });

  it("solves through pass-challenge, caches the cookie, and reuses it", async () => {
    const http = new FakeHttpClient()
      .on("/record/2", (req) =>
        req.cookieJar?.headerFor("https://cds.cern.ch/record/2")?.includes("anubis-auth")
          ? { body: "<html>record</html>" }
          : { body: page(1), headers: { "content-type": "text/html" } },
      )
      .on("/.within.website", (req) => {
        req.cookieJar?.applySetCookie("https://cds.cern.ch/x", [
          "techaro.lol-anubis-auth-x=jwt; Path=/; Max-Age=3600",
        ]);
        return { status: 302, headers: { location: "/record/2" } };
      });
    const s = solver(dir, "anubis");
    const first = await s.ensure(http, "https://cds.cern.ch/record/2", { delay: 0 });
    expect(first).toMatchObject({ ok: true });
    expect(first.note).toMatch(/^solved \(nonce \d+\)$/);
    expect(s.status("cds.cern.ch").state).toBe("valid");
    const pass = http.calls.find((c) => c.url.includes("pass-challenge"))!;
    expect(pass.url).toContain("id=c1");
    expect(pass.url).toContain("redir=https%3A%2F%2Fcds.cern.ch%2Frecord%2F2");
    const calls = http.calls.length;
    expect(await s.ensure(http, "https://cds.cern.ch/record/2")).toEqual({
      ok: true,
      note: "cached cookie still valid",
    });
    expect(http.calls.length).toBe(calls);
    expect(allEntries(dir)).toMatchObject([
      { solver: "anubis", host: "cds.cern.ch", state: "valid" },
    ]);
    expect(clearAll(dir, "anubis", "other")).toEqual([]);
    expect(clearAll(dir)).toEqual([{ solver: "anubis", host: "cds.cern.ch" }]);
    expect(allEntries(dir)).toEqual([]);
  });

  it("reports a page that is not a challenge, and an unsupported algorithm", async () => {
    const plain = new FakeHttpClient().on("/record/2", { status: 403, body: "denied" });
    expect(await solver(dir, "anubis").ensure(plain, "https://h/record/2")).toMatchObject({
      ok: false,
      note: expect.stringContaining("not a anubis challenge"),
    });
    const slow = new FakeHttpClient().on("/record/2", {
      body: page(1).replace('"fast"', '"slow"'),
      headers: { "content-type": "text/html" },
    });
    expect(await solver(dir, "anubis").ensure(slow, "https://h/record/2")).toMatchObject({
      ok: false,
      note: "unsupported Anubis algorithm slow",
    });
    expect(() => solver(dir, "nope")).toThrow(/Unknown challenge solver/);
  });
});
