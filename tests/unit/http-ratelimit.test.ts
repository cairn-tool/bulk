import { describe, expect, it } from "vitest";
import {
  Limiter,
  LimiterTable,
  MAX_BACKOFF,
  parseSeconds,
  type Clock,
} from "../../src/http/ratelimit.js";

function fakeClock(start = 1000): Clock & { slept: number[]; advance(s: number): void } {
  let now = start;
  const slept: number[] = [];
  return {
    slept,
    now: () => now,
    async sleep(s) {
      slept.push(s);
      now += s;
    },
    advance: (s) => (now += s),
  };
}

describe("parseSeconds", () => {
  it("reads units, bare seconds, and HTTP dates", () => {
    expect(parseSeconds("1s")).toBe(1);
    expect(parseSeconds("60")).toBe(60);
    expect(parseSeconds("2m")).toBe(120);
    expect(parseSeconds("500ms")).toBe(0.5);
    const now = 1_700_000_000;
    expect(parseSeconds(new Date((now + 30) * 1000).toUTCString(), now)).toBeCloseTo(30, 0);
    expect(parseSeconds("soon")).toBeUndefined();
    expect(parseSeconds("")).toBeUndefined();
  });
});

describe("Limiter", () => {
  it("paces from Crossref's x-rate-limit headers", async () => {
    const clock = fakeClock();
    const limiter = new Limiter("api.crossref.org", 0, clock);
    limiter.observe(new Headers({ "x-rate-limit-limit": "10", "x-rate-limit-interval": "1s" }));
    expect(limiter.interval).toBeCloseTo(0.1);
    expect(limiter.source).toBe("advertised limit");
    await limiter.wait();
    await limiter.wait();
    expect(clock.slept).toHaveLength(1);
    expect(clock.slept[0]).toBeCloseTo(0.1);
  });

  it("backs off for Retry-After on a 429 and defaults when the host gives none", async () => {
    const clock = fakeClock();
    const limiter = new Limiter("h", 0, clock);
    limiter.observe(new Headers({ "retry-after": "7" }), 429);
    expect(limiter.source).toBe("HTTP 429 with Retry-After");
    await limiter.wait();
    expect(clock.slept).toEqual([7]);
    limiter.observe(new Headers(), 503);
    await limiter.wait();
    expect(clock.slept[1]).toBe(5);
  });

  it("caps a back-off at MAX_BACKOFF", () => {
    const clock = fakeClock();
    const limiter = new Limiter("h", 0, clock);
    limiter.observe(new Headers({ "retry-after": "9999" }), 429);
    expect(limiter.state().waiting).toBe(MAX_BACKOFF);
  });

  it("spreads a nearly exhausted budget over the window and pauses when it is gone", async () => {
    const clock = fakeClock();
    const limiter = new Limiter("h", 0, clock);
    limiter.observe(new Headers({ "ratelimit-remaining": "2", "ratelimit-reset": "10" }));
    expect(limiter.interval).toBe(5);
    limiter.observe(new Headers({ "ratelimit-remaining": "0", "ratelimit-reset": "30" }));
    expect(limiter.source).toBe("budget exhausted");
    await limiter.wait();
    expect(clock.slept).toEqual([30]);
  });

  it("never lets an advertised limit lower a declared floor", () => {
    const limiter = new Limiter("export.arxiv.org", 3, fakeClock());
    expect(limiter.source).toBe("declared policy");
    limiter.observe(new Headers({ "x-rate-limit-limit": "100", "x-rate-limit-interval": "1s" }));
    expect(limiter.interval).toBe(3);
  });
});

describe("LimiterTable", () => {
  it("creates one limiter per host with its declared floor and reports states", () => {
    const table = new LimiterTable({ "export.arxiv.org": 3 }, fakeClock());
    expect(table.for("export.arxiv.org").interval).toBe(3);
    expect(table.for("other").interval).toBe(0);
    expect(table.for("other")).toBe(table.for("other"));
    table.declare("other", 1.5);
    expect(table.for("other").interval).toBe(1.5);
    expect(
      table
        .states()
        .map((s) => s.host)
        .sort(),
    ).toEqual(["export.arxiv.org", "other"]);
    expect(table.declared()).toEqual({ "export.arxiv.org": 3, other: 1.5 });
  });
});
