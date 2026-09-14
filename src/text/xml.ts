import { XMLParser } from "fast-xml-parser";

export interface XmlOptions {
  /** Element names that are always arrays, even when there is one. */
  arrays?: readonly string[];
  /** Strip namespace prefixes so `marc:record` and `record` read the same. Default true. */
  removePrefixes?: boolean;
}

/**
 * Parses an XML document into plain objects. Attributes are keyed `@_name`, text
 * of a mixed element is `#text`, and the names in `arrays` are forced to arrays
 * so a record with one datafield does not parse differently from one with two.
 */
export function parseXml(text: string, opts: XmlOptions = {}): Record<string, unknown> {
  const arrays = new Set(opts.arrays ?? []);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: opts.removePrefixes ?? true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => arrays.has(name),
  });
  return parser.parse(text) as Record<string, unknown>;
}

/** The text of a node that may be a string, an object with `#text`, or absent. */
export function xmlText(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return xmlText(node[0]);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>))
    return String((node as Record<string, unknown>)["#text"] ?? "");
  return "";
}

export function xmlArray<T = unknown>(node: unknown): T[] {
  if (node === undefined || node === null) return [];
  return Array.isArray(node) ? (node as T[]) : [node as T];
}

/**
 * Splits a large XML file into the text of each `<name …>…</name>` element,
 * one at a time, without parsing the whole document. NIST's catalogue is 84 MB;
 * this is what keeps it out of memory.
 */
export async function* xmlRecords(
  chunks: AsyncIterable<string | Buffer>,
  name: string,
): AsyncGenerator<string> {
  const open = new RegExp(`<(?:[A-Za-z0-9_-]+:)?${name}(?=[\\s>])`);
  const close = new RegExp(`</(?:[A-Za-z0-9_-]+:)?${name}>`);
  let buffer = "";
  for await (const chunk of chunks) {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf-8");
    for (;;) {
      const start = buffer.search(open);
      if (start === -1) {
        // Keep a tail in case an opening tag straddles the chunk boundary.
        buffer = buffer.slice(Math.max(0, buffer.length - 64));
        break;
      }
      const rest = buffer.slice(start);
      const endMatch = close.exec(rest);
      if (!endMatch) {
        buffer = rest;
        break;
      }
      const end = endMatch.index + endMatch[0].length;
      yield rest.slice(0, end);
      buffer = rest.slice(end);
    }
  }
}
