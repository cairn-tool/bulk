/**
 * Host overrides: `hosts:` in the configuration and the `BULK_HOSTS` variable
 * rewrite a host to another base URL. This is how the integration tests point
 * every plugin at a local fixture server, and how a mirror or proxy can stand in
 * for a slow origin. The original host keeps driving the limiter, the
 * User-Agent policy and the cookie jar, so behaviour stays that of the real host.
 */

export interface Rewritten {
  url: string;
  /** The host the caller named, before any rewrite. */
  originalHost: string;
  rewritten: boolean;
}

export class HostOverrides {
  private readonly map: Map<string, string>;

  constructor(entries: Record<string, string> = {}) {
    this.map = new Map(Object.entries(entries).map(([host, base]) => [host.toLowerCase(), base]));
  }

  /** `host=http://127.0.0.1:1234,other=http://…` → overrides, layered over the configured map. */
  static fromEnv(configured: Record<string, string>, env: string | undefined): HostOverrides {
    const merged = { ...configured };
    for (const pair of (env ?? "").split(",")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) throw new Error(`BULK_HOSTS entry is not host=url: ${trimmed}`);
      merged[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return new HostOverrides(merged);
  }

  size(): number {
    return this.map.size;
  }

  rewrite(url: string): Rewritten {
    const u = new URL(url);
    const base = this.map.get(u.hostname.toLowerCase());
    if (!base) return { url, originalHost: u.hostname, rewritten: false };
    const b = new URL(base);
    u.protocol = b.protocol;
    u.hostname = b.hostname;
    u.port = b.port;
    // A base with a path prefixes the request path (a mirror under /archive/).
    if (b.pathname && b.pathname !== "/") u.pathname = b.pathname.replace(/\/$/, "") + u.pathname;
    return { url: u.toString(), originalHost: new URL(url).hostname, rewritten: true };
  }
}
