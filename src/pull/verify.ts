import fs from "node:fs";
import path from "node:path";
import type { HttpClient } from "../http/types.js";
import type { CookieJar } from "../http/cookie-jar.js";
import { magicFor, startsWith, type Item, type ItemRequest } from "./item.js";

export interface VerifiedResult {
  status: "ok" | "fail";
  note: string;
  http: number;
  bytes: number;
  sha256: string;
}

export interface FetchVerifiedOptions {
  onProgress?: (bytes: number, seconds: number) => void;
  signal?: AbortSignal;
  /** Resolves an item's cookie jar id. */
  jar?: (id: string) => CookieJar;
}

/**
 * Downloads one URL to `target` through a `.part` file and keeps it only if it
 * verifies: HTTP 200, a non-empty body, the magic bytes for the target's
 * extension (or the item's override), the byte count when the catalogue states
 * one, and the digest when the catalogue states one. Nothing is accepted on the
 * strength of a status code — a 0-byte 200 and an HTML page in place of a PDF
 * are the two failures the sources actually produce.
 */
export async function fetchVerified(
  http: HttpClient,
  item: Item,
  url: string,
  target: string,
  request: ItemRequest | undefined,
  opts: FetchVerifiedOptions = {},
): Promise<VerifiedResult> {
  const part = `${target}.part`;
  const magic = magicFor({ dest: target, magic: item.magic });
  let http_ = 0;
  let bytes = 0;
  let note = "";
  try {
    const result = await http.download({
      url,
      toFile: part,
      method: request?.method,
      headers: request?.headers,
      body: request?.body,
      userAgent: request?.userAgent,
      cookieJar: request?.cookieJar && opts.jar ? opts.jar(request.cookieJar) : undefined,
      onProgress: opts.onProgress,
      signal: opts.signal,
      digest: item.digest?.algorithm === "sha1" ? "sha1" : undefined,
    });
    http_ = result.status;
    bytes = result.bytes;
    const html = result.contentType.startsWith("text/html");
    if (result.status !== 200) note = `http ${result.status} ${result.contentType}`.trim();
    else if (result.bytes === 0) note = `empty body (${result.contentType})`;
    else if (magic && !startsWith(result.head, magic))
      note = html
        ? `an HTML page instead of the file (${result.bytes} bytes) — a login, a challenge or an error page`
        : `wrong magic (${result.contentType}, ${result.bytes} bytes)`;
    else if (item.bytes && result.bytes !== item.bytes)
      note = `size ${result.bytes} != listed ${item.bytes}`;
    else if (item.digest) {
      const got = item.digest.algorithm === "sha256" ? result.sha256 : result.digest;
      if (got !== item.digest.value.toLowerCase()) note = `${item.digest.algorithm} mismatch`;
    }
    if (!note) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.renameSync(part, target);
      return { status: "ok", note: "", http: http_, bytes, sha256: result.sha256 };
    }
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    note = (error as Error).message;
  } finally {
    fs.rmSync(part, { force: true });
  }
  return { status: "fail", note, http: http_, bytes, sha256: "" };
}
