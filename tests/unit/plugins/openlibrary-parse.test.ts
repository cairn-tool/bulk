import { describe, expect, it } from "vitest";
import {
  findIsbns,
  isbn10Ok,
  isbn13Ok,
  normalizeIsbn,
  recordOf,
  to13,
} from "../../../src/plugins/openlibrary/parse.js";

describe("ISBN normalisation", () => {
  it("validates check digits and converts ISBN-10 to ISBN-13", () => {
    expect(isbn13Ok("9780262033848")).toBe(true);
    expect(isbn13Ok("9780262033849")).toBe(false);
    expect(isbn10Ok("0071449590")).toBe(true);
    expect(isbn10Ok("0071449591")).toBe(false);
    expect(isbn10Ok("080442957X")).toBe(true);
    expect(to13("0071449590")).toBe("9780071449595");
    expect(normalizeIsbn("978-0-262-03384-8")).toBe("9780262033848");
    expect(normalizeIsbn("0 07 144959 0")).toBe("9780071449595");
    expect(normalizeIsbn("not an isbn")).toBeNull();
  });
  it("finds labelled and bare ISBNs in text, in order, once each", () => {
    const text =
      "ISBN: 0-07-144959-0 and ISBN-13 978-0-262-03384-8; also bare 9780262033848 and junk 9780000000003.";
    expect(findIsbns(text)).toEqual(["9780071449595", "9780262033848"]);
  });
  it("shapes a record", () => {
    expect(
      recordOf({
        title: "T",
        authors: [{ name: "A" }, {}],
        publishers: [{ name: "P" }],
        number_of_pages: 3,
      }),
    ).toEqual({
      title: "T",
      subtitle: null,
      authors: ["A"],
      date: null,
      publishers: ["P"],
      pages: 3,
      subjects: [],
      url: null,
    });
  });
});
