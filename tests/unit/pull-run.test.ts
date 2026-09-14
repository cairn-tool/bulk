import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeHttpClient } from "../../src/http/fake-client.js";
import { exitCodeFor, runItems } from "../../src/pull/run.js";
import { parseTsv } from "../../src/text/tsv.js";

let dir: string;
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-run-"))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const pdf = "%PDF-1.4\n" + "y".repeat(40);
const pdfResponse = { body: pdf, headers: { "content-type": "application/pdf" } };

describe("runItems", () => {
  it("downloads, logs, skips present files on the second run, and counts failures", async () => {
    const http = new FakeHttpClient()
      .on("/a.pdf", pdfResponse)
      .on("/b.pdf", { body: "", headers: { "content-type": "application/pdf" } });
    const items = [
      { dest: "A/a.pdf", url: "https://h/a.pdf", bytes: pdf.length, extra: {} },
      { dest: "B/b.pdf", url: "https://h/b.pdf", extra: {} },
    ];
    const first = await runItems(http, items, dir, { delay: 0 });
    expect(first).toMatchObject({ ok: 1, skip: 0, fail: 1, bytes: pdf.length, interrupted: false });
    expect(first.failures[0]).toMatchObject({
      dest: "B/b.pdf",
      note: "empty body (application/pdf)",
    });
    expect(exitCodeFor(first)).toBe(2);
    const log = parseTsv(fs.readFileSync(path.join(dir, "_download-log.tsv"), "utf-8"));
    expect(log.map((r) => r.status)).toEqual(["ok", "fail"]);
    expect(log[0].sha256).toHaveLength(64);

    const second = await runItems(http, items, dir, { delay: 0 });
    expect(second).toMatchObject({ ok: 0, skip: 1, fail: 1 });
    expect(http.calls.filter((c) => c.url.endsWith("/a.pdf"))).toHaveLength(1);
  });

  it("tries fallbacks in order and skips a fallback destination that is present", async () => {
    const http = new FakeHttpClient()
      .on("/rfc1.pdf", { status: 404, body: "no", headers: { "content-type": "text/html" } })
      .on("/rfc1.txt", { body: "RFC text", headers: { "content-type": "text/plain" } });
    const items = [
      {
        dest: "RFC 1.pdf",
        url: "https://h/rfc1.pdf",
        extra: {},
        fallbacks: [{ url: "https://h/rfc1.txt", dest: "RFC 1.txt" }],
      },
    ];
    const first = await runItems(http, items, dir, { delay: 0 });
    expect(first.ok).toBe(1);
    expect(fs.existsSync(path.join(dir, "RFC 1.txt"))).toBe(true);
    const log = parseTsv(fs.readFileSync(path.join(dir, "_download-log.tsv"), "utf-8"));
    expect(log.map((r) => [r.status, r.dest])).toEqual([
      ["fail", "RFC 1.pdf"],
      ["ok", "RFC 1.txt"],
    ]);
    const second = await runItems(http, items, dir, { delay: 0 });
    expect(second.skip).toBe(1);
  });

  it("stops on an abort signal, reports it, and leaves no .part behind", async () => {
    const controller = new AbortController();
    const http = new FakeHttpClient().on("/a.pdf", pdfResponse).on("/b.pdf", pdfResponse);
    http.download = async (req) => {
      controller.abort();
      fs.mkdirSync(path.dirname(req.toFile), { recursive: true });
      fs.writeFileSync(req.toFile, "partial");
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    };
    const items = [
      { dest: "a.pdf", url: "https://h/a.pdf", extra: {} },
      { dest: "b.pdf", url: "https://h/b.pdf", extra: {} },
    ];
    const outcome = await runItems(http, items, dir, { delay: 0, signal: controller.signal });
    expect(outcome.interrupted).toBe(true);
    expect(exitCodeFor(outcome)).toBe(130);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".part"))).toEqual([]);
    expect(fs.existsSync(path.join(dir, "b.pdf"))).toBe(false);
  });

  it("writes the progress line padded off a terminal", async () => {
    const out: string[] = [];
    const http = new FakeHttpClient().on("/a.pdf", pdfResponse);
    await runItems(http, [{ dest: "a.pdf", url: "https://h/a.pdf", extra: {} }], dir, {
      delay: 0,
      stream: { write: (t: string) => out.push(t), isTTY: false },
    });
    const text = out.join("");
    expect(text).toMatch(/\[1\/1\] 100\.0% {2}a\.pdf\s+ok 49 B \d+\.\ds\n/);
    expect(text).toContain("ok 1  skip 0  fail 0");
  });
});
