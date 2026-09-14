import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeHttpClient } from "../../src/http/fake-client.js";
import { fetchVerified } from "../../src/pull/verify.js";
import { MAGIC, magicFor, startsWith, type Item } from "../../src/pull/item.js";

let dir: string;
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-verify-"))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const pdf = "%PDF-1.4\n" + "x".repeat(100);

describe("magic table", () => {
  it("knows the document types and skips text", () => {
    expect(magicFor({ dest: "a.PDF" })).toEqual(MAGIC[".pdf"]);
    expect(magicFor({ dest: "a.csv" })).toBeNull();
    expect(magicFor({ dest: "a.pdf", magic: null })).toBeNull();
    expect(startsWith(new TextEncoder().encode("%PDF-1"), MAGIC[".pdf"]!)).toBe(true);
    expect(startsWith(new TextEncoder().encode("<html>"), MAGIC[".pdf"]!)).toBe(false);
  });
});

describe("fetchVerified", () => {
  const item = (over: Partial<Item> = {}): Item => ({
    dest: "x.pdf",
    url: "https://h/x.pdf",
    extra: {},
    ...over,
  });
  const target = () => path.join(dir, "x.pdf");

  it("keeps a verified file and removes the .part", async () => {
    const http = new FakeHttpClient().on("/x.pdf", {
      body: pdf,
      headers: { "content-type": "application/pdf" },
    });
    const result = await fetchVerified(
      http,
      item({ bytes: pdf.length }),
      "https://h/x.pdf",
      target(),
      undefined,
    );
    expect(result.status).toBe("ok");
    expect(result.sha256).toHaveLength(64);
    expect(fs.existsSync(target())).toBe(true);
    expect(fs.existsSync(target() + ".part")).toBe(false);
  });

  it.each<
    [string, { status?: number; body: string; headers: Record<string, string> }, Partial<Item>]
  >([
    [
      "http 404 text/html",
      { status: 404, body: "no", headers: { "content-type": "text/html" } },
      {},
    ],
    [
      "empty body (application/pdf)",
      { body: "", headers: { "content-type": "application/pdf" } },
      {},
    ],
    [
      "an HTML page instead of the file (15 bytes) — a login, a challenge or an error page",
      { body: "<html>hi</html>", headers: { "content-type": "text/html" } },
      {},
    ],
    [
      "wrong magic (application/octet-stream, 5 bytes)",
      { body: "hello", headers: { "content-type": "application/octet-stream" } },
      {},
    ],
    [
      `size ${pdf.length} != listed 1`,
      { body: pdf, headers: { "content-type": "application/pdf" } },
      { bytes: 1 },
    ],
    [
      "sha256 mismatch",
      { body: pdf, headers: { "content-type": "application/pdf" } },
      { digest: { algorithm: "sha256", value: "00" } },
    ],
  ])("fails with %s and leaves nothing behind", async (note, response, over) => {
    const http = new FakeHttpClient().on("/x.pdf", response);
    const result = await fetchVerified(http, item(over), "https://h/x.pdf", target(), undefined);
    expect(result.status).toBe("fail");
    expect(result.note).toBe(note);
    expect(fs.existsSync(target())).toBe(false);
    expect(fs.existsSync(target() + ".part")).toBe(false);
  });

  it("verifies a sha1 digest, case-insensitively", async () => {
    const http = new FakeHttpClient().on("/x.pdf", {
      body: pdf,
      headers: { "content-type": "application/pdf" },
    });
    const sha1 = createHash("sha1").update(pdf).digest("hex");
    const ok = await fetchVerified(
      http,
      item({ digest: { algorithm: "sha1", value: sha1.toUpperCase() } }),
      "https://h/x.pdf",
      target(),
      undefined,
    );
    expect(ok.status).toBe("ok");
  });

  it("records a transport error as a failure", async () => {
    const http = new FakeHttpClient();
    http.download = async () => {
      throw new Error("boom");
    };
    const result = await fetchVerified(http, item(), "https://h/x.pdf", target(), undefined);
    expect(result).toMatchObject({ status: "fail", note: "boom" });
  });
});
