import fs from "node:fs";
import type { BulkPlugin, QueryAnswer, QueryService } from "../../plugin/types.js";
import { manifest } from "./manifest.js";
import { findIsbns, normalizeIsbn, recordOf, type OpenLibraryBook } from "./parse.js";

export const API = "https://openlibrary.org/api/books";

export interface IsbnOptions {
  find?: string[];
}

export const isbn: QueryService<IsbnOptions> = {
  normalize: (raw) => normalizeIsbn(raw),
  async expandKeys(_ctx, opts) {
    const keys: string[] = [];
    for (const file of opts.find ?? []) keys.push(...findIsbns(fs.readFileSync(file, "utf-8")));
    return keys;
  },
  async lookup(keys, ctx) {
    const url = `${API}?bibkeys=${keys.map((k) => `ISBN:${k}`).join(",")}&format=json&jscmd=data`;
    const response = await ctx.http.request({
      url,
      accept: "application/json",
      signal: ctx.signal,
      timeoutMs: 60_000,
    });
    if (response.status !== 200) throw new Error(`http ${response.status}`);
    const data = await response.json<Record<string, OpenLibraryBook>>();
    const out: Record<string, QueryAnswer> = {};
    for (const key of keys) {
      const book = data[`ISBN:${key}`];
      out[key] = book ? recordOf(book) : null;
    }
    return out;
  },
  describe: (record) => String(record.title ?? "found"),
};

export const plugin: BulkPlugin = { manifest, query: isbn as QueryService<never> };
