import type { CookieJar } from "./cookie-jar.js";
import type { LimiterState } from "./ratelimit.js";

/**
 * Which User-Agent a request carries.
 *
 * - `browser`: a current Chrome string — what most hosts expect.
 * - `curl`: `curl/8.x` — some Akamai-fronted hosts (NOAA's repository, the NRC's
 *   document server) deny the browser string sent from a script and serve curl's own.
 * - `polite`: `bulk/<version> (mailto:<contact>)` — Crossref, Open Library and NTRS
 *   ask for a contact address, and Crossref rewards it with a larger rate budget.
 */
export type UaKind = "browser" | "curl" | "polite";

export interface HttpRequest {
  url: string;
  method?: "GET" | "POST" | "HEAD";
  headers?: Record<string, string>;
  body?: string | URLSearchParams | Uint8Array;
  /** Convenience for the Accept header. */
  accept?: string;
  /** Overrides the host policy's User-Agent kind. */
  userAgent?: UaKind;
  /** Sends matching cookies and records Set-Cookie on every hop. */
  cookieJar?: CookieJar;
  timeoutMs?: number;
  /** Default true: wait for the host's limiter before sending and learn from the response after. */
  pace?: boolean;
  /** How many times a 429/503 is re-sent after the pause the host asked for (default 2). */
  retries?: number;
  /** Default "follow" (up to 10 hops, cookies recorded per hop). */
  redirect?: "follow" | "manual";
  signal?: AbortSignal;
}

export interface HttpResponse {
  status: number;
  headers: Headers;
  contentType: string;
  /** Final URL after redirects. */
  url: string;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
  json<T = unknown>(): Promise<T>;
  /** For the hosts that still serve Windows-1252 pages (ITU-R). */
  textAs(encoding: "windows-1252" | "utf-8"): Promise<string>;
}

export interface DownloadRequest extends HttpRequest {
  /** The file to write. The client writes it directly; callers pass a `.part` path and rename on success. */
  toFile: string;
  /** Called at most every 200 ms while the body streams. */
  onProgress?: (bytes: number, seconds: number) => void;
  /** An extra digest to compute alongside the sha256 the log always records. */
  digest?: "sha1";
}

export interface DownloadResult {
  status: number;
  contentType: string;
  bytes: number;
  sha256: string;
  /** Present when `digest` was requested. */
  digest?: string;
  /** The first 8 bytes, for the magic check. */
  head: Uint8Array;
  url: string;
  headers: Headers;
}

export interface HttpClient {
  request(req: HttpRequest): Promise<HttpResponse>;
  download(req: DownloadRequest): Promise<DownloadResult>;
  /** The final URL of the redirect chain, without transferring the body. */
  resolve(url: string, opts?: { userAgent?: UaKind; signal?: AbortSignal }): Promise<string>;
  /** Every host's pacing state — what `bulk cache limits` prints. */
  limits(): LimiterState[];
}
