import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LimiterState } from "./ratelimit.js";
import type {
  DownloadRequest,
  DownloadResult,
  HttpClient,
  HttpRequest,
  HttpResponse,
  UaKind,
} from "./types.js";

export interface FakeResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  /** Final URL to report, when the route stands in for a redirect chain. */
  url?: string;
}

export interface FakeRoute {
  match: (req: HttpRequest, calls: number) => boolean;
  respond: (req: HttpRequest, calls: number) => FakeResponse;
}

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  userAgent?: UaKind;
}

/**
 * A scripted client for unit tests: routes are matched in order, every call is
 * recorded, and no socket is ever opened. Plugin engines take an `HttpClient`,
 * so this lets a test assert the exact request a plugin sends — the CAROL query
 * body, the NTRL pagination form, the docket antiforgery token — and feed it
 * fixture bodies in return.
 */
export class FakeHttpClient implements HttpClient {
  readonly calls: RecordedCall[] = [];
  private readonly counts = new Map<string, number>();

  constructor(private readonly routes: FakeRoute[] = []) {}

  route(match: FakeRoute["match"], respond: FakeRoute["respond"]): this {
    this.routes.push({ match, respond });
    return this;
  }

  /** A route matched on the URL containing `fragment`. */
  on(fragment: string, respond: FakeRoute["respond"] | FakeResponse): this {
    const responder = typeof respond === "function" ? respond : () => respond;
    return this.route((req) => req.url.includes(fragment), responder);
  }

  private answer(req: HttpRequest): FakeResponse {
    const key = req.url;
    const n = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, n);
    this.calls.push({
      url: req.url,
      method: req.method ?? "GET",
      headers: req.headers ?? {},
      body: req.body === undefined ? undefined : req.body.toString(),
      userAgent: req.userAgent,
    });
    const route = this.routes.find((r) => r.match(req, n));
    if (!route) return { status: 404, body: `no fake route for ${req.url}` };
    return route.respond(req, n);
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    const fake = this.answer(req);
    const headers = new Headers(fake.headers ?? {});
    const bytes =
      typeof fake.body === "string"
        ? new TextEncoder().encode(fake.body)
        : (fake.body ?? new Uint8Array(0));
    const textAs = async (encoding: "windows-1252" | "utf-8"): Promise<string> =>
      new TextDecoder(encoding).decode(bytes);
    return {
      status: fake.status ?? 200,
      headers,
      contentType: (headers.get("content-type") ?? "").toLowerCase(),
      url: fake.url ?? req.url,
      bytes: async () => bytes,
      text: () => textAs("utf-8"),
      textAs,
      json: async <T>() => JSON.parse(await textAs("utf-8")) as T,
    };
  }

  async download(req: DownloadRequest): Promise<DownloadResult> {
    const fake = this.answer(req);
    const bytes =
      typeof fake.body === "string"
        ? new TextEncoder().encode(fake.body)
        : (fake.body ?? new Uint8Array(0));
    fs.mkdirSync(path.dirname(req.toFile), { recursive: true });
    fs.writeFileSync(req.toFile, bytes);
    req.onProgress?.(bytes.length, 0);
    const headers = new Headers(fake.headers ?? {});
    return {
      status: fake.status ?? 200,
      contentType: (headers.get("content-type") ?? "").toLowerCase(),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...(req.digest ? { digest: createHash(req.digest).update(bytes).digest("hex") } : {}),
      head: bytes.subarray(0, 8),
      url: fake.url ?? req.url,
      headers,
    };
  }

  async resolve(url: string): Promise<string> {
    const fake = this.answer({ url, method: "GET" });
    return fake.url ?? url;
  }

  limits(): LimiterState[] {
    return [];
  }
}
