import fs from "node:fs";
import path from "node:path";
import { CookieJar } from "../http/cookie-jar.js";
import type { ProgressStream } from "../pull/progress.js";
import { runItems, type RunOutcome } from "../pull/run.js";
import { solver } from "../challenge/registry.js";
import type { Runtime } from "../runtime.js";
import type { FetchContext, Item, Logger, QueryContext } from "./types.js";

export interface ContextOptions {
  pluginId: string;
  runtime: Runtime;
  /** Where progress and notes go; stderr in practice, a buffer in tests. */
  stream: ProgressStream;
  quiet?: boolean;
  signal?: AbortSignal;
  delay: number;
}

/**
 * The cookie jars of one run. `session:<name>` jars live for the process and
 * are deleted at the end; `challenge:<solver>:<host>` jars are the solver's
 * cached jars on disk, shared across runs.
 */
export class JarStore {
  private readonly jars = new Map<string, CookieJar>();
  private readonly sessionDir: string;

  constructor(
    private readonly cacheDir: string,
    pluginId: string,
  ) {
    this.sessionDir = path.join(cacheDir, "sessions", pluginId);
  }

  jar(id: string): CookieJar {
    let jar = this.jars.get(id);
    if (jar) return jar;
    const [kind, ...rest] = id.split(":");
    if (kind === "challenge") {
      const [solverId, host] = rest;
      jar = solver(this.cacheDir, solverId).jar(host);
    } else if (kind === "session") {
      jar = new CookieJar(path.join(this.sessionDir, `${rest.join("_") || "default"}.jar`));
    } else throw new Error(`Unknown cookie jar id: ${id}`);
    this.jars.set(id, jar);
    return jar;
  }

  /** Session jars are a run's own; nothing outlives it. */
  close(): void {
    fs.rmSync(this.sessionDir, { recursive: true, force: true });
  }
}

export function makeLogger(stream: ProgressStream, quiet = false): Logger {
  return {
    info: (message) => {
      if (!quiet) stream.write(message + "\n");
    },
    warn: (message) => process.stderr.write(message + "\n"),
  };
}

const sleep = (seconds: number): Promise<void> => new Promise((r) => setTimeout(r, seconds * 1000));

export function buildFetchContext(
  opts: ContextOptions & { dest: string; limit: number; listFile?: string },
): {
  ctx: FetchContext;
  jars: JarStore;
} {
  const { runtime, pluginId } = opts;
  const jars = new JarStore(runtime.config.cacheDir, pluginId);
  const signal = opts.signal ?? new AbortController().signal;
  const log = makeLogger(opts.stream, opts.quiet);
  const ctx: FetchContext = {
    pluginId,
    config: runtime.config,
    http: runtime.http,
    dest: opts.dest,
    delay: opts.delay,
    limit: opts.limit,
    listFile: opts.listFile,
    log,
    stream: opts.quiet ? { write: () => undefined, isTTY: false } : opts.stream,
    jar: (id) => jars.jar(id),
    ensureChallenge: async (id, url) => {
      const settings = runtime.config.challenge[id];
      if (settings && !settings.enabled)
        return { ok: false, note: `${id} solving is disabled in the config` };
      return solver(runtime.config.cacheDir, id).ensure(runtime.http, url, {
        refreshMargin: settings?.refreshMargin,
        delay: settings?.delay,
        log: (m) => log.info(m),
      });
    },
    run: (items: readonly Item[], runOpts) =>
      runItems(runtime.http, items, opts.dest, {
        delay: opts.delay,
        logName: runOpts?.logName,
        stream: opts.quiet ? undefined : opts.stream,
        signal,
        jar: (id) => jars.jar(id),
      }),
    signal,
    now: () => new Date(),
    sleep,
  };
  return { ctx, jars };
}

export function buildQueryContext(opts: ContextOptions): { ctx: QueryContext; jars: JarStore } {
  const { runtime, pluginId } = opts;
  const jars = new JarStore(runtime.config.cacheDir, pluginId);
  const ctx: QueryContext = {
    pluginId,
    config: runtime.config,
    http: runtime.http,
    delay: opts.delay,
    log: makeLogger(opts.stream, opts.quiet),
    stream: opts.quiet ? { write: () => undefined, isTTY: false } : opts.stream,
    jar: (id) => jars.jar(id),
    signal: opts.signal ?? new AbortController().signal,
    sleep,
  };
  return { ctx, jars };
}

export type { RunOutcome };
