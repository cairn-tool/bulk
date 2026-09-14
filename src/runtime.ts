import { loadConfig, type ResolvedConfig } from "./config.js";
import { FetchHttpClient } from "./http/fetch-client.js";
import { HostOverrides } from "./http/hosts.js";
import { LimiterTable } from "./http/ratelimit.js";
import type { HttpClient, UaKind } from "./http/types.js";
import { PLUGINS } from "./plugins/index.js";
import type { HostPolicy } from "./plugin/types.js";

export interface Runtime {
  config: ResolvedConfig;
  http: HttpClient;
  limiters: LimiterTable;
  policies: Map<string, HostPolicy>;
}

let active: Runtime | undefined;

/** Every host policy every plugin declares, keyed by host. Two plugins naming one host must agree. */
export function hostPolicies(): Map<string, HostPolicy> {
  const map = new Map<string, HostPolicy>();
  for (const entry of PLUGINS) {
    for (const policy of entry.manifest.hosts) {
      const existing = map.get(policy.host);
      if (existing && existing.userAgent !== policy.userAgent)
        throw new Error(`Plugins disagree on the User-Agent for ${policy.host}`);
      map.set(policy.host, { ...existing, ...policy });
    }
  }
  return map;
}

export interface RuntimeOptions {
  http?: HttpClient;
  config?: ResolvedConfig;
  env?: NodeJS.ProcessEnv;
}

/**
 * Installs the process-wide runtime: the configuration, the host policy table
 * built from every manifest, the limiter table (declared floors overridden by
 * `limits:`) and the HTTP client. Tests pass a fake client.
 */
export function initializeRuntime(opts: RuntimeOptions = {}): Runtime {
  const env = opts.env ?? process.env;
  const config = opts.config ?? loadConfig({ env });
  const policies = hostPolicies();
  const floors: Record<string, number> = {};
  for (const policy of policies.values())
    if (policy.minInterval) floors[policy.host] = policy.minInterval;
  Object.assign(floors, config.limits);
  const limiters = new LimiterTable(floors);
  const http =
    opts.http ??
    new FetchHttpClient({
      policies: (host) => {
        const policy = policies.get(host);
        return policy
          ? { userAgent: policy.userAgent as UaKind, timeoutMs: policy.timeoutMs }
          : undefined;
      },
      overrides: HostOverrides.fromEnv(config.hosts, env.BULK_HOSTS),
      limiters,
      contact: config.contact,
    });
  active = { config, http, limiters, policies };
  return active;
}

export function runtime(): Runtime {
  return active ?? initializeRuntime();
}

export function resetRuntime(): void {
  active = undefined;
}
