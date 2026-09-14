import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieJar, parseSetCookie } from "../../src/http/cookie-jar.js";

let dir: string;
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-jar-"))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const NETSCAPE = [
  "# Netscape HTTP Cookie File",
  "# https://curl.se/docs/http-cookies.html",
  "",
  "#HttpOnly_.cds.cern.ch\tTRUE\t/\tTRUE\t4102444800\ttecharo.lol-anubis-auth-x\teyJhbGci",
  "cds.cern.ch\tFALSE\t/record\tFALSE\t0\tsession\tabc",
  "",
].join("\n");

describe("CookieJar", () => {
  it("reads the Netscape format the Python tool wrote, and writes it back byte-stable", () => {
    const jar = CookieJar.fromText(NETSCAPE);
    expect(jar.all()).toHaveLength(2);
    const auth = jar.find((c) => c.name.includes("anubis-auth"));
    expect(auth).toMatchObject({
      domain: ".cds.cern.ch",
      includeSubdomains: true,
      secure: true,
      httpOnly: true,
      expires: 4102444800,
    });
    const again = CookieJar.fromText(jar.serialize());
    expect(again.serialize()).toBe(jar.serialize());
  });

  it("matches on domain suffix, path prefix, scheme and expiry", () => {
    const jar = CookieJar.fromText(NETSCAPE);
    expect(jar.headerFor("https://cds.cern.ch/record/1/files/x.pdf")).toBe(
      "techaro.lol-anubis-auth-x=eyJhbGci; session=abc",
    );
    expect(jar.headerFor("https://cds.cern.ch/search")).toBe("techaro.lol-anubis-auth-x=eyJhbGci");
    expect(jar.headerFor("http://cds.cern.ch/search")).toBeUndefined();
    expect(jar.headerFor("https://www.cds.cern.ch/x")).toBe("techaro.lol-anubis-auth-x=eyJhbGci");
    expect(jar.headerFor("https://cern.ch/x")).toBeUndefined();
    expect(jar.headerFor("https://cds.cern.ch/record/1", 5_000_000_000)).toBe("session=abc");
  });

  it("applies Set-Cookie with attributes and deletes on a past expiry", () => {
    const jar = new CookieJar();
    const url = "https://data.ntsb.gov/Docket/Forms/searchdocket";
    jar.applySetCookie(
      url,
      [
        "__RequestVerificationToken=tok; path=/; httponly",
        "__cf_bm=abc; Domain=ntsb.gov; Path=/; Secure; Max-Age=1800",
      ],
      100,
    );
    expect(jar.headerFor("https://data.ntsb.gov/Docket?ProjectID=1", 100)).toBe(
      "__RequestVerificationToken=tok; __cf_bm=abc",
    );
    expect(jar.headerFor("https://www.ntsb.gov/x", 100)).toBe("__cf_bm=abc");
    jar.applySetCookie(url, ["__cf_bm=; Domain=ntsb.gov; Path=/; Max-Age=0"], 100);
    expect(jar.headerFor("https://www.ntsb.gov/x", 100)).toBeUndefined();
  });

  it("parses Expires when Max-Age is absent, and ignores a foreign Domain", () => {
    const url = new URL("https://a.example.org/p/q");
    const cookie = parseSetCookie(
      "x=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Domain=other.org",
      url,
      0,
    )!;
    expect(cookie.expires).toBe(Math.floor(Date.parse("Wed, 21 Oct 2026 07:28:00 GMT") / 1000));
    expect(cookie.domain).toBe("a.example.org");
    expect(cookie.path).toBe("/p");
    expect(parseSetCookie("=novalue", url)).toBeUndefined();
  });

  it("saves atomically to its file", () => {
    const file = path.join(dir, "h.jar");
    const jar = new CookieJar(file);
    jar.applySetCookie("https://h/", ["a=b"]);
    jar.save();
    expect(CookieJar.load(file).headerFor("https://h/")).toBe("a=b");
    expect(fs.readdirSync(dir)).toEqual(["h.jar"]);
  });
});
