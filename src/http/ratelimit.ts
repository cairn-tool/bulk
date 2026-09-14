/**
 * Per-host self-pacing from the rate limits a server advertises.
 *
 * Every request the client makes passes through here: before it goes out the
 * limiter waits long enough to stay inside the host's stated budget, and after it
 * comes back the response headers are read for what the host is asking for. A host
 * that says nothing keeps whatever pacing the command chose; a host that publishes
 * a limit is obeyed without the command having to know about it.
 *
 * Headers understood (case-insensitive):
 *
 *   x-rate-limit-limit / x-rate-limit-interval   Crossref: "10" and "1s"
 *   ratelimit-limit / -remaining / -reset        RFC 9239-style; `reset` is seconds from now or an epoch
 *   x-ratelimit-limit / -remaining / -reset
 *   retry-after                                  On 429/503: seconds, or an HTTP date
 *
 * A 429 or 503 also arms a back-off: the next `wait()` sleeps out the
 * `Retry-After` the host gave (or a default when it gave none).
 */

export const DEFAULT_BACKOFF = 5;
export const MAX_BACKOFF = 300;

export interface Clock {
  now(): number; // seconds
  sleep(seconds: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now() / 1000,
  sleep: (seconds) => new Promise((resolve) => setTimeout(resolve, Math.max(0, seconds * 1000))),
};

/** `'1s'`, `'60'`, `'2m'`, an HTTP date → seconds, or undefined. */
export function parseSeconds(
  value: string | null | undefined,
  now = Date.now() / 1000,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  const m = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i.exec(v);
  if (m) {
    const n = Number(m[1]);
    const unit = (m[2] ?? "s").toLowerCase();
    return n * ({ ms: 0.001, s: 1, m: 60, h: 3600 } as Record<string, number>)[unit];
  }
  const date = Date.parse(v);
  if (Number.isNaN(date)) return undefined;
  return Math.max(date / 1000 - now, 0);
}

export interface LimiterState {
  host: string;
  interval: number;
  limit: number | null;
  window: number | null;
  remaining: number | null;
  source: string;
  waiting: number;
}

/** One host's budget: a minimum spacing between requests, plus any back-off. */
export class Limiter {
  interval = 0;
  limit: number | null = null;
  window: number | null = null;
  remaining: number | null = null;
  source = "";
  private nextAllowed = 0;
  private readonly floor: number;

  constructor(
    readonly host: string,
    floor = 0,
    private readonly clock: Clock = realClock,
  ) {
    this.floor = floor;
    if (floor > 0) {
      this.interval = floor;
      this.source = "declared policy";
    }
  }

  /** Read a response's rate-limit headers. */
  observe(headers: Headers, status = 200): void {
    const get = (...names: string[]): string | null => {
      for (const name of names) {
        const value = headers.get(name);
        if (value) return value;
      }
      return null;
    };
    const limit = get("x-rate-limit-limit", "ratelimit-limit", "x-ratelimit-limit");
    const window = get("x-rate-limit-interval", "ratelimit-window", "x-ratelimit-interval");
    const remaining = get("ratelimit-remaining", "x-ratelimit-remaining");
    const reset = get("ratelimit-reset", "x-ratelimit-reset");
    const retryAfter = get("retry-after");

    if (limit !== null) {
      const m = /^\s*(\d+)/.exec(limit); // "10", or "10, 100;w=60"
      if (m) {
        this.limit = Number(m[1]);
        this.window = parseSeconds(window, this.clock.now()) ?? 1;
        if (this.limit > 0) {
          const advertised = this.window / this.limit;
          this.interval = Math.max(advertised, this.floor);
          this.source = "advertised limit";
        }
      }
    }
    if (remaining !== null) {
      const m = /^\s*(\d+)/.exec(remaining);
      if (m) {
        this.remaining = Number(m[1]);
        const left = parseSeconds(reset, this.clock.now());
        if (left && this.remaining === 0) this.backOff(left, "budget exhausted");
        else if (left && this.remaining > 0 && this.remaining < 5)
          this.interval = Math.max(this.interval, left / this.remaining);
      }
    }
    if (status === 429 || status === 503) {
      this.backOff(
        parseSeconds(retryAfter, this.clock.now()) ?? DEFAULT_BACKOFF,
        `HTTP ${status}${retryAfter ? " with Retry-After" : ""}`,
      );
    }
  }

  backOff(seconds: number, why = ""): void {
    const s = Math.min(Math.max(seconds, 0), MAX_BACKOFF);
    this.nextAllowed = Math.max(this.nextAllowed, this.clock.now() + s);
    if (why) this.source = why;
  }

  /** Block until this host may be called again. Returns the seconds waited. */
  async wait(): Promise<number> {
    const now = this.clock.now();
    const due = this.nextAllowed;
    const delay = Math.max(due - now, 0);
    this.nextAllowed = Math.max(due, now) + this.interval;
    if (delay > 0) await this.clock.sleep(delay);
    return delay;
  }

  state(): LimiterState {
    return {
      host: this.host,
      interval: Math.round(this.interval * 1000) / 1000,
      limit: this.limit,
      window: this.window,
      remaining: this.remaining,
      source: this.source,
      waiting: Math.round(Math.max(this.nextAllowed - this.clock.now(), 0) * 10) / 10,
    };
  }
}

/**
 * The limiters of one process, one per host. Declared floors come from the
 * plugin manifests (`HostPolicy.minInterval`), overridden by `limits:` in the
 * configuration so a test can lift arXiv's three seconds to zero.
 */
export class LimiterTable {
  private readonly limiters = new Map<string, Limiter>();

  constructor(
    private readonly floors: Record<string, number> = {},
    private readonly clock: Clock = realClock,
  ) {}

  declare(host: string, seconds: number): void {
    this.floors[host] = seconds;
    const existing = this.limiters.get(host);
    if (existing && existing.interval < seconds) {
      existing.interval = seconds;
      existing.source = "declared policy";
    }
  }

  for(host: string): Limiter {
    let limiter = this.limiters.get(host);
    if (!limiter) {
      limiter = new Limiter(host, this.floors[host] ?? 0, this.clock);
      this.limiters.set(host, limiter);
    }
    return limiter;
  }

  declared(): Record<string, number> {
    return { ...this.floors };
  }

  states(): LimiterState[] {
    return [...this.limiters.values()].map((limiter) => limiter.state());
  }
}
