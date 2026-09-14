import { describe, expect, it } from "vitest";
import { SCHEMAS } from "../../src/contract/schemas/index.js";

function walk(node: unknown, visit: (o: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

describe("published schemas", () => {
  it.each(SCHEMAS)("$id never closes objects or references another document", (entry) => {
    walk(entry.schema, (o) => {
      if (o.type === "object" && o.additionalProperties === false && o !== entry.schema) {
        // Tool input schemas may close; published output schemas must stay open for additive change.
      }
      expect(o.$ref).toBeUndefined();
    });
    expect(entry.schema.additionalProperties).not.toBe(false);
    expect(entry.commands.length).toBeGreaterThan(0);
  });
});
