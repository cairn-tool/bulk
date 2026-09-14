import { describe, expect, it } from "vitest";
import { cleanTitle, dedupeDests, duplicateDests, safeName } from "../../src/pull/naming.js";
import type { Item } from "../../src/pull/item.js";

describe("cleanTitle", () => {
  it("replaces the characters a file name cannot carry, the way the Python tool did", () => {
    expect(cleanTitle("In-flight Breakup: Trans World Airlines Flight 800/N93119")).toBe(
      "In-flight Breakup - Trans World Airlines Flight 800 and N93119",
    );
    expect(cleanTitle('A "quoted" <title> | with ? and *')).toBe("A quoted title with and");
  });
  it("drops control and zero-width characters and collapses whitespace", () => {
    expect(cleanTitle("Tab\there​zerobell   spaced ")).toBe("Tabherezerobell spaced");
  });
  it("strips leading and trailing dots, dashes and spaces", () => {
    expect(cleanTitle(" - .Title. - ")).toBe("Title");
    expect(cleanTitle(undefined)).toBe("");
  });
  it("normalises to NFC", () => {
    expect(cleanTitle("é")).toBe("é");
  });
});

describe("safeName", () => {
  it("cuts at a word under the limit", () => {
    const long = "word ".repeat(50).trim();
    const cut = safeName(long, 42);
    expect(cut.length).toBeLessThanOrEqual(42);
    expect(cut.endsWith("word")).toBe(true);
  });
  it("leaves short names alone", () => {
    expect(safeName("short")).toBe("short");
  });
});

describe("dedupeDests", () => {
  const item = (dest: string, id: number): Item => ({ dest, url: "u", extra: { list_id: id } });
  it("appends the source row id to colliding destinations, case-insensitively", () => {
    const items = [item("A/x.pdf", 1), item("a/X.pdf", 2), item("b/y.pdf", 3)];
    dedupeDests(items);
    expect(items.map((i) => i.dest)).toEqual(["A/x (1).pdf", "a/X (2).pdf", "b/y.pdf"]);
    expect(duplicateDests(items)).toEqual([]);
  });
  it("reports duplicates that survive", () => {
    expect(duplicateDests([item("a.pdf", 1), item("A.pdf", 1)])).toEqual(["A.pdf"]);
  });
});
