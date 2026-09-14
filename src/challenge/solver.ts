import fs from "node:fs";
import path from "node:path";
import { CookieJar } from "../http/cookie-jar.js";
import type { HttpClient } from "../http/types.js";

export type CookieState = "valid" | "expiring" | "expired" | "none";

export interface SolveResult {
  ok: boolean;
  note: string;
}

export interface EnsureOptions {
  /** Re-solve when the cached cookie expires within this many seconds. */
  refreshMargin?: number;
  /** Seconds to wait after presenting the proof before checking the cookie. */
  delay?: number;
  log?: (message: string) => void;
}

export interface JarEntry {
  solver: string;
  host: string;
  state: CookieState;
  expires: number | null;
  file: string;
  bytes: number;
}

/**
 * One bot-challenge gate. A subclass says whether a response body is its
 * challenge (`detect`) and turns that challenge into an auth cookie (`solve`).
 * Everything else — where the jar lives, whether a cached cookie is still
 * valid, listing and clearing — is here, so a new gate is two methods.
 *
 * Jars live under `<cache>/<solver>/<host>.jar` in curl's Netscape format, the
 * same place and shape the Python tool used, so its cookies are reused.
 */
export abstract class Solver {
  abstract readonly name: string;
  /** A substring of the cookie name the gate issues. */
  abstract readonly authCookie: string;
  abstract readonly label: string;

  constructor(readonly cacheDir: string) {}

  dir(): string {
    return path.join(this.cacheDir, this.name);
  }

  jarPath(host: string): string {
    return path.join(this.dir(), `${host}.jar`);
  }

  jar(host: string): CookieJar {
    return CookieJar.load(this.jarPath(host));
  }

  status(
    host: string,
    margin = 0,
    now = Date.now() / 1000,
  ): { state: CookieState; expires: number | null } {
    const jar = this.jar(host);
    const cookie = jar.find((c) => c.name.includes(this.authCookie) && c.value.length > 0);
    if (!cookie) return { state: "none", expires: null };
    if (!cookie.expires) return { state: "valid", expires: null };
    if (cookie.expires <= now) return { state: "expired", expires: cookie.expires };
    if (cookie.expires <= now + margin) return { state: "expiring", expires: cookie.expires };
    return { state: "valid", expires: cookie.expires };
  }

  abstract detect(text: string, contentType?: string): boolean;

  protected abstract solve(
    http: HttpClient,
    url: string,
    pageText: string,
    host: string,
    jar: CookieJar,
    opts: Required<Pick<EnsureOptions, "delay">> & { log: (message: string) => void },
  ): Promise<SolveResult>;

  /**
   * Make sure a valid cookie for the URL's host is cached: fetch and solve only
   * when the cached cookie is missing or near expiry.
   */
  async ensure(http: HttpClient, url: string, opts: EnsureOptions = {}): Promise<SolveResult> {
    const host = new URL(url).hostname;
    if (this.status(host, opts.refreshMargin ?? 600).state === "valid")
      return { ok: true, note: "cached cookie still valid" };
    const jar = this.jar(host);
    const response = await http.request({ url, cookieJar: jar, timeoutMs: 120_000 });
    const text = await response.text();
    if (response.status === 200 && !this.detect(text, response.contentType)) {
      jar.save();
      return { ok: true, note: "host served the page without a challenge" };
    }
    if (!this.detect(text, response.contentType))
      return {
        ok: false,
        note: `not a ${this.name} challenge (HTTP ${response.status}); the gate may have changed`,
      };
    const result = await this.solve(http, url, text, host, jar, {
      delay: opts.delay ?? 1,
      log: opts.log ?? (() => undefined),
    });
    jar.save();
    return result;
  }

  entries(): JarEntry[] {
    const dir = this.dir();
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".jar"))
      .sort()
      .map((name) => {
        const host = name.slice(0, -4);
        const { state, expires } = this.status(host);
        const file = path.join(dir, name);
        return { solver: this.name, host, state, expires, file, bytes: fs.statSync(file).size };
      });
  }

  clear(host?: string): string[] {
    const removed: string[] = [];
    for (const entry of this.entries()) {
      if (host && entry.host !== host) continue;
      fs.rmSync(entry.file, { force: true });
      removed.push(entry.host);
    }
    return removed;
  }
}
