import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { HostOverrides } from "./hosts.js";
import { HttpError } from "./errors.js";
import { LimiterTable, realClock, type Clock, type LimiterState } from "./ratelimit.js";
import type {
  DownloadRequest,
  DownloadResult,
  HttpClient,
  HttpRequest,
  HttpResponse,
  UaKind,
} from "./types.js";
import { userAgentFor } from "./user-agent.js";

export interface HostPolicyLookup {
  (host: string): { userAgent: UaKind; timeoutMs?: number } | undefined;
}

export interface FetchClientOptions {
  policies?: HostPolicyLookup;
  overrides?: HostOverrides;
  limiters?: LimiterTable;
  contact?: string;
  /** Injection point for unit tests; the integration suite uses a real server instead. */
  fetchImpl?: typeof fetch;
  clock?: Clock;
  /** Milliseconds a request may take before it is abandoned (catalogue calls). */
  defaultTimeoutMs?: number;
  /** Milliseconds a download may take (files). */
  downloadTimeoutMs?: number;
}

const MAX_REDIRECTS = 10;
const PROGRESS_EVERY_MS = 200;
const DEFAULT_TIMEOUT_MS = 120_000;
const DOWNLOAD_TIMEOUT_MS = 600_000;

function contentTypeOf(headers: Headers): string {
  return (headers.get("content-type") ?? "").toLowerCase();
}

function bodyBytes(body: HttpRequest["body"]): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string" || body instanceof URLSearchParams) return body;
  return new Blob([body as BlobPart]);
}

function combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => Boolean(s));
  if (!present.length) return undefined;
  if (present.length === 1) return present[0];
  return AbortSignal.any(present);
}

/**
 * The HTTP client behind every plugin, over Node's own `fetch`.
 *
 * Every request goes through one pipeline: host override → wait for the host's
 * limiter → assemble headers (User-Agent by host policy, cookies from the jar,
 * caller headers last) → send with `redirect: "manual"` and follow redirects by
 * hand so the jar sees every hop's `Set-Cookie` → learn from the response's
 * rate-limit headers → re-send a 429/503 after the pause the host asked for.
 *
 * The manual redirect loop is load-bearing: `fetch`'s automatic redirects hide
 * the intermediate responses, and three sources set their session cookie on a
 * redirect (the NTSB docket antiforgery cookie, NTRL's JSESSIONID, and the Anubis
 * JWT that `pass-challenge` sets while redirecting back).
 */
export class FetchHttpClient implements HttpClient {
  private readonly policies: HostPolicyLookup;
  private readonly overrides: HostOverrides;
  private readonly limiters: LimiterTable;
  private readonly contact?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: Clock;
  private readonly defaultTimeoutMs: number;
  private readonly downloadTimeoutMs: number;

  constructor(opts: FetchClientOptions = {}) {
    this.policies = opts.policies ?? (() => undefined);
    this.overrides = opts.overrides ?? new HostOverrides();
    this.limiters = opts.limiters ?? new LimiterTable();
    this.contact = opts.contact;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.clock = opts.clock ?? realClock;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.downloadTimeoutMs = opts.downloadTimeoutMs ?? DOWNLOAD_TIMEOUT_MS;
  }

  limits(): LimiterState[] {
    return this.limiters.states();
  }

  /**
   * Sends one request and follows redirects. Returns the final `Response` with
   * its body unread, plus the URL it came from.
   */
  private async send(
    req: HttpRequest,
    timeoutMs: number,
  ): Promise<{ response: Response; url: string }> {
    const retries = req.retries ?? 2;
    const pace = req.pace ?? true;
    let url = req.url;
    let method = req.method ?? "GET";
    let body = bodyBytes(req.body);
    let hops = 0;
    for (;;) {
      const { url: target, originalHost } = this.overrides.rewrite(url);
      const policy = this.policies(originalHost);
      const limiter = pace ? this.limiters.for(originalHost) : undefined;
      const headers = new Headers();
      headers.set(
        "user-agent",
        userAgentFor(req.userAgent ?? policy?.userAgent ?? "browser", { contact: this.contact }),
      );
      headers.set("accept", req.accept ?? "*/*");
      headers.set("x-bulk-host", originalHost);
      const cookie = req.cookieJar?.headerFor(url);
      if (cookie) headers.set("cookie", cookie);
      if (body instanceof URLSearchParams)
        headers.set("content-type", "application/x-www-form-urlencoded");
      for (const [name, value] of Object.entries(req.headers ?? {})) headers.set(name, value);

      let response: Response | undefined;
      for (let attempt = 0; ; attempt++) {
        if (limiter) await limiter.wait();
        const signal = combineSignals(
          req.signal,
          AbortSignal.timeout(policy?.timeoutMs ?? timeoutMs),
        );
        try {
          response = await this.fetchImpl(target, {
            method,
            headers,
            body,
            redirect: "manual",
            signal,
          });
        } catch (error) {
          if (req.signal?.aborted) throw error;
          throw new HttpError(`${originalHost}: ${(error as Error).message}`, undefined, url);
        }
        if (limiter) limiter.observe(response.headers, response.status);
        req.cookieJar?.applySetCookie(url, response.headers.getSetCookie());
        // A host that asked us to slow down gets another chance, after the pause it named.
        if ((response.status === 429 || response.status === 503) && limiter && attempt < retries) {
          await response.body?.cancel();
          continue;
        }
        break;
      }
      if (!response) throw new HttpError("no response", undefined, url);

      const location = response.headers.get("location");
      const isRedirect = response.status >= 300 && response.status < 400 && location;
      if (!isRedirect || (req.redirect ?? "follow") === "manual") return { response, url };
      await response.body?.cancel();
      if (++hops > MAX_REDIRECTS)
        throw new HttpError(`too many redirects from ${req.url}`, response.status, url);
      url = new URL(location, url).toString();
      if (response.status === 301 || response.status === 302 || response.status === 303) {
        if (method !== "HEAD") method = "GET";
        body = undefined;
      }
    }
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    const { response, url } = await this.send(req, req.timeoutMs ?? this.defaultTimeoutMs);
    let cached: Promise<Uint8Array> | undefined;
    const bytes = (): Promise<Uint8Array> => {
      cached ??= response.arrayBuffer().then((buffer) => new Uint8Array(buffer));
      return cached;
    };
    const textAs = async (encoding: "windows-1252" | "utf-8"): Promise<string> =>
      new TextDecoder(encoding).decode(await bytes());
    return {
      status: response.status,
      headers: response.headers,
      contentType: contentTypeOf(response.headers),
      url,
      bytes,
      text: () => textAs("utf-8"),
      textAs,
      json: async <T>() => JSON.parse(await textAs("utf-8")) as T,
    };
  }

  async download(req: DownloadRequest): Promise<DownloadResult> {
    const { response, url } = await this.send(req, req.timeoutMs ?? this.downloadTimeoutMs);
    const sha256 = createHash("sha256");
    const extra = req.digest ? createHash(req.digest) : undefined;
    let head = new Uint8Array(0);
    let total = 0;
    const started = Date.now();
    let lastReport = 0;
    const report = (force = false): void => {
      if (!req.onProgress) return;
      const now = Date.now();
      if (!force && now - lastReport < PROGRESS_EVERY_MS) return;
      lastReport = now;
      req.onProgress(total, (now - started) / 1000);
    };
    const tap = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (head.length < 8) head = Buffer.concat([head, chunk]).subarray(0, 8);
        sha256.update(chunk);
        extra?.update(chunk);
        total += chunk.length;
        report();
        callback(null, chunk);
      },
    });
    fs.mkdirSync(path.dirname(req.toFile), { recursive: true });
    fs.rmSync(req.toFile, { force: true });
    const sink = fs.createWriteStream(req.toFile, { flags: "wx" });
    const source = response.body
      ? Readable.fromWeb(response.body as unknown as WebReadableStream<Uint8Array>)
      : Readable.from([]);
    try {
      await pipeline(source, tap, sink, { signal: req.signal });
    } catch (error) {
      sink.destroy();
      throw error;
    }
    report(true);
    return {
      status: response.status,
      contentType: contentTypeOf(response.headers),
      bytes: total,
      sha256: sha256.digest("hex"),
      ...(extra ? { digest: extra.digest("hex") } : {}),
      head,
      url,
      headers: response.headers,
    };
  }

  async resolve(
    url: string,
    opts: { userAgent?: UaKind; signal?: AbortSignal } = {},
  ): Promise<string> {
    const { response, url: final } = await this.send(
      {
        url,
        method: "GET",
        headers: { range: "bytes=0-0" },
        userAgent: opts.userAgent,
        signal: opts.signal,
      },
      this.defaultTimeoutMs,
    );
    await response.body?.cancel();
    return final;
  }
}
