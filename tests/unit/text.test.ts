import { describe, expect, it } from "vitest";
import { byteCompare, hms, human } from "../../src/text/bytes.js";
import { parseCsv, parseCsvRecords } from "../../src/text/csv.js";
import { textOf, unescapeHtml } from "../../src/text/html.js";
import { cell, formatTsv, parseTsv } from "../../src/text/tsv.js";
import { parseXml, xmlArray, xmlRecords, xmlText } from "../../src/text/xml.js";
import { readKeys } from "../../src/query/keys.js";
import { cellText, queryRows, renderTable } from "../../src/query/emit.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("bytes", () => {
  it("formats sizes and durations", () => {
    expect(human(512)).toBe("512 B");
    expect(human(1536)).toBe("1.5 KB");
    expect(human(4.55 * 1024 ** 3)).toBe("4.5 GB");
    expect(hms(3723)).toBe("1:02:03");
    expect(["b", "a", "B"].sort(byteCompare)).toEqual(["B", "a", "b"]);
  });
});

describe("tsv", () => {
  it("flattens cells and round-trips", () => {
    expect(cell("a\tb\nc")).toBe("a b c");
    expect(cell(["x", "y"])).toBe("x, y");
    expect(cell(null)).toBe("");
    const text = formatTsv([{ a: 1, b: "two" }], ["a", "b", "c"]);
    expect(text).toBe("a\tb\tc\n1\ttwo\t\n");
    expect(parseTsv(text)).toEqual([{ a: "1", b: "two", c: "" }]);
  });
});

describe("csv", () => {
  it("handles quotes, doubled quotes, CRLF and the BOM", () => {
    const text = '﻿a,b\r\n"x, y","say ""hi"""\r\n1,2\r\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["1", "2"],
    ]);
    expect(parseCsvRecords(text)).toEqual([
      { a: "x, y", b: 'say "hi"' },
      { a: "1", b: "2" },
    ]);
  });
});

describe("html", () => {
  it("strips tags and decodes entities", () => {
    expect(textOf("<b>A &amp; B</b> &#169; &#x41;&nbsp;x")).toBe("A & B © A x");
    expect(unescapeHtml("&unknown;")).toBe("&unknown;");
  });
});

describe("xml", () => {
  it("parses with prefixes removed and forced arrays", () => {
    const doc = parseXml('<m:root xmlns:m="x"><m:item a="1">t</m:item></m:root>', {
      arrays: ["item"],
    });
    const root = doc.root as Record<string, unknown>;
    expect(xmlArray(root.item)).toHaveLength(1);
    expect(xmlText(xmlArray<Record<string, unknown>>(root.item)[0])).toBe("t");
    expect(xmlText(undefined)).toBe("");
  });
  it("splits a large document into records without holding it", async () => {
    const parts = [
      "<coll><mods:mods id='1'>a</mods:mo",
      "ds><mods:mods id='2'>b</mods:mods><mo",
      "ds:mods id='3'>c</mods:mods></coll>",
    ];
    const out: string[] = [];
    for await (const r of xmlRecords(
      (async function* () {
        yield* parts;
      })(),
      "mods",
    ))
      out.push(r);
    expect(out).toEqual([
      "<mods:mods id='1'>a</mods:mods>",
      "<mods:mods id='2'>b</mods:mods>",
      "<mods:mods id='3'>c</mods:mods>",
    ]);
  });
});

describe("query helpers", () => {
  it("reads keys from argv and a file, deduplicated", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-keys-"));
    const file = path.join(dir, "k.txt");
    fs.writeFileSync(file, "# comment\n a \n\nb\na\n");
    expect(readKeys(["b", "c"], file)).toEqual(["b", "c", "a"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("renders rows and a capped table", () => {
    const rows = queryRows(
      { k1: { title: "T".repeat(80), n: [1, 2] }, k2: null, k3: { error: "boom" } },
      [{ key: "key", width: 5 }, { key: "title" }, { key: "n", value: (_k, r) => r.n }],
    );
    expect(rows).toEqual([
      { key: "k1", title: "T".repeat(80), n: "1, 2" },
      { key: "k2", title: "", n: "" },
      { key: "k3", title: "", n: "" },
    ]);
    const table = renderTable(rows, [{ key: "key", width: 5 }, { key: "title" }, { key: "n" }]);
    expect(table.split("\n")[0]).toBe(
      "key  title                                                         n",
    );
    expect(table.split("\n")[1].length).toBeLessThanOrEqual(5 + 2 + 60 + 2 + 4);
    expect(cellText(undefined)).toBe("");
  });
});
