import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildItems, modeOf, parseList } from "../../../src/plugins/ntsb-reports/parse.js";
import { FIXTURES } from "../../helpers/source-server.js";

const text = fs.readFileSync(path.join(FIXTURES, "www.ntsb.gov", "reports-list.json"), "utf-8");

describe("ntsb-reports parser", () => {
  it("reads the SharePoint list and infers modes from the series prefix", () => {
    const { items, paged } = parseList(text);
    expect(paged).toBe(false);
    expect(items).toHaveLength(4);
    expect(modeOf({ Mode: { results: ["Hazmat", "Railroad"] } }, "HZM")).toEqual({
      mode: "Hazmat",
      modes: "Hazmat/Railroad",
    });
    expect(modeOf({ Mode: null }, "RAR1901")).toEqual({ mode: "Railroad", modes: "" });
    expect(modeOf({ Mode: null }, "ZZZ")).toEqual({ mode: "Unclassified", modes: "" });
  });
  it("builds items sorted by mode then destination, URL-encoding the path", () => {
    const items = buildItems(parseList(text).items);
    expect(items.map((i) => String(i.extra.mode))).toEqual([
      "Aviation",
      "Highway",
      "Highway",
      "Marine",
    ]);
    expect(items[2].url).toBe(
      "https://www.ntsb.gov/investigations/AccidentReports/Reports/HAB1808%20.pdf",
    );
    expect(items[0].bytes).toBeGreaterThan(0);
  });
  it("rejects a document without the list shape", () => {
    expect(() => parseList("{}")).toThrow(/d\.results/);
  });
});
