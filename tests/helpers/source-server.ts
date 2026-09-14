import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "sources",
);

export interface Route {
  method?: string;
  /** Path to match exactly (query string excluded), or a prefix when it ends with `*`. */
  path: string;
  /** Query parameters that must be present with these values. */
  query?: Record<string, string>;
  /** A substring the request body must contain. */
  bodyIncludes?: string;
  /** A cookie name the request must carry; otherwise `challenge` (or 403) is served. */
  requiresCookie?: string;
  status?: number;
  headers?: Record<string, string>;
  /** A fixture file relative to the host directory, or inline text. */
  file?: string;
  body?: string;
  /** Per-call responses: the Nth call gets the Nth entry (the last repeats). */
  sequence?: Array<{
    status?: number;
    headers?: Record<string, string>;
    file?: string;
    body?: string;
  }>;
}

export interface RecordedRequest {
  host: string;
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

export interface SourceServer {
  port: number;
  baseUrl: string;
  /** `host=http://127.0.0.1:port,…` for BULK_HOSTS. */
  hostsEnv: string;
  hosts: Record<string, string>;
  requests: RecordedRequest[];
  close(): Promise<void>;
}

export interface SourceServerOptions {
  /** Hosts to serve; each needs `tests/fixtures/sources/<host>/routes.json` or `routes`. */
  hosts: string[];
  /** Routes given inline instead of from a routes.json, keyed by host. */
  routes?: Record<string, Route[]>;
  fixtures?: string;
}

function loadRoutes(dir: string, host: string, inline?: Route[]): Route[] {
  if (inline) return inline;
  const file = path.join(dir, host, "routes.json");
  if (!fs.existsSync(file)) throw new Error(`no fixture routes for ${host}: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Route[];
}

function matches(route: Route, method: string, url: URL, body: string, cookies: string): boolean {
  if ((route.method ?? "GET") !== method) return false;
  const pathname = decodeURIComponent(url.pathname);
  if (
    route.path.endsWith("*")
      ? !pathname.startsWith(route.path.slice(0, -1))
      : pathname !== route.path
  )
    return false;
  for (const [k, v] of Object.entries(route.query ?? {}))
    if (url.searchParams.get(k) !== v) return false;
  if (route.bodyIncludes && !body.includes(route.bodyIncludes)) return false;
  if (route.requiresCookie && !cookies.includes(route.requiresCookie)) return false;
  return true;
}

/**
 * A local HTTP server standing in for every source host at once. Requests are
 * routed by the `x-bulk-host` header the client sets (the host the plugin
 * named, before the override), to that host's fixture directory. Every request
 * is recorded so a test can assert the exact URL, headers and body a plugin sent.
 */
export async function startSourceServer(opts: SourceServerOptions): Promise<SourceServer> {
  const fixtures = opts.fixtures ?? FIXTURES;
  const routes = new Map(opts.hosts.map((h) => [h, loadRoutes(fixtures, h, opts.routes?.[h])]));
  const calls = new Map<string, number>();
  const requests: RecordedRequest[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf-8");
      const host = String(req.headers["x-bulk-host"] ?? req.headers.host ?? "");
      const url = new URL(req.url ?? "/", `http://${host}`);
      requests.push({
        host,
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: req.headers,
        body,
      });
      const table = routes.get(host);
      const cookies = String(req.headers.cookie ?? "");
      const route = table?.find((r) => matches(r, req.method ?? "GET", url, body, cookies));
      if (!route) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end(`no fixture route: ${host} ${req.method} ${url.pathname}`);
        return;
      }
      const key = `${host}|${route.method ?? "GET"}|${route.path}|${route.bodyIncludes ?? ""}|${route.requiresCookie ?? ""}`;
      const n = (calls.get(key) ?? 0) + 1;
      calls.set(key, n);
      const step = route.sequence
        ? route.sequence[Math.min(n - 1, route.sequence.length - 1)]
        : route;
      const status = step.status ?? route.status ?? 200;
      const headers = { ...(route.headers ?? {}), ...(step.headers ?? {}) };
      let payload: Buffer;
      if (step.file ?? route.file) {
        const file = path.join(fixtures, host, (step.file ?? route.file) as string);
        payload = fs.readFileSync(file);
        if (!headers["content-type"]) headers["content-type"] = contentTypeFor(file);
      } else payload = Buffer.from(step.body ?? route.body ?? "");
      res.writeHead(status, headers);
      res.end(payload);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  const hosts = Object.fromEntries(opts.hosts.map((h) => [h, baseUrl]));
  return {
    port,
    baseUrl,
    hosts,
    hostsEnv: opts.hosts.map((h) => `${h}=${baseUrl}`).join(","),
    requests,
    close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

function contentTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html; charset=utf-8",
      ".xhtml": "text/html; charset=utf-8",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".atom": "application/atom+xml",
    }[ext] ?? "application/octet-stream"
  );
}
