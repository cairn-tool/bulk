import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FakeHttpClient } from "../../src/http/fake-client.js";
import { FetchHttpClient } from "../../src/http/fetch-client.js";
import { HostOverrides } from "../../src/http/hosts.js";
import { LimiterTable } from "../../src/http/ratelimit.js";
import type { HttpClient } from "../../src/http/types.js";
import { defaultConfig, type ResolvedConfig } from "../../src/config.js";
import { hostPolicies, initializeRuntime, resetRuntime, type Runtime } from "../../src/runtime.js";

/** A throwaway HOME/config/cache for one test. */
export function tempEnv(prefix = "bulk-test-"): {
  dir: string;
  env: NodeJS.ProcessEnv;
  cleanup(): void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: dir,
    XDG_CONFIG_HOME: path.join(dir, "config"),
    XDG_CACHE_HOME: path.join(dir, "cache"),
    BULK_CONFIG: path.join(dir, "config", "bulk", "config.yml"),
    BULK_CACHE: path.join(dir, "cache", "bulk"),
    CI: "1",
  };
  delete env.BULK_ARCHIVE;
  delete env.BULK_CONTACT;
  delete env.BULK_HOSTS;
  return { dir, env, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

export interface TestRuntimeOptions {
  http?: HttpClient;
  hosts?: Record<string, string>;
  config?: Partial<ResolvedConfig>;
  cacheDir: string;
}

/** A runtime for in-process tests: a fake client, or a real one pointed at a fixture server with every floor lifted. */
export function testRuntime(opts: TestRuntimeOptions): Runtime {
  resetRuntime();
  const config: ResolvedConfig = {
    ...defaultConfig({ env: {} }),
    ...opts.config,
    cacheDir: opts.cacheDir,
    hosts: opts.hosts ?? {},
  };
  const policies = hostPolicies();
  const limiters = new LimiterTable({});
  const http =
    opts.http ??
    new FetchHttpClient({
      policies: (host) => {
        const p = policies.get(host);
        return p ? { userAgent: p.userAgent } : undefined;
      },
      overrides: new HostOverrides(config.hosts),
      limiters,
      contact: config.contact,
    });
  return initializeRuntime({ http, config });
}

export { FakeHttpClient };
