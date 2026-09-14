import { Progress, type ProgressStream } from "../pull/progress.js";
import type { QueryAnswer, QueryCache, QueryRecord } from "./cache.js";

export type QueryResult = QueryAnswer | { error: string };
export type QueryResults = Record<string, QueryResult>;

export interface ResolveOptions {
  cache: QueryCache;
  refresh?: boolean;
  batchSize?: number;
  delay?: number;
  stream?: ProgressStream;
  describe?: (record: QueryRecord) => string;
  signal?: AbortSignal;
  sleep?: (seconds: number) => Promise<void>;
}

export function isError(result: QueryResult): result is { error: string } {
  return (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    Object.keys(result).length === 1
  );
}

export function isFound(result: QueryResult): result is QueryRecord {
  return result !== null && !isError(result);
}

const silent: ProgressStream = { write: () => undefined, isTTY: false };

function outcome(result: QueryResult, describe?: (record: QueryRecord) => string): string {
  if (isError(result)) return `error: ${result.error}`;
  if (!result) return "no match";
  return describe ? describe(result) : "found";
}

/**
 * Answers every key through the cache, calling `lookup` on batches of misses.
 * One progress line per key; the cache is saved after every batch so an
 * interrupted run keeps what it learned; a failed request marks its batch as
 * errors and the run continues.
 */
export async function resolveKeys(
  keys: readonly string[],
  lookup: (batch: string[]) => Promise<Record<string, QueryAnswer>>,
  opts: ResolveOptions,
): Promise<QueryResults> {
  const stream = opts.stream ?? silent;
  const batchSize = Math.max(1, opts.batchSize ?? 1);
  const sleep = opts.sleep ?? ((s: number) => new Promise<void>((r) => setTimeout(r, s * 1000)));
  const results: QueryResults = {};
  const todo: string[] = [];
  for (const key of keys) {
    const cached = opts.cache.get(key);
    if (cached !== undefined && !opts.refresh) results[key] = cached;
    else todo.push(key);
  }
  const progress = new Progress(keys.length, stream);
  let n = 0;
  for (const key of keys) {
    if (key in results) {
      n++;
      progress.start(n, key);
      progress.finish("cached: " + outcome(results[key], opts.describe));
    }
  }
  for (let i = 0; i < todo.length; i += batchSize) {
    if (opts.signal?.aborted) break;
    const group = todo.slice(i, i + batchSize);
    if (batchSize === 1) {
      n++;
      progress.start(n, group[0]);
    }
    let got: Record<string, QueryAnswer>;
    try {
      got = await lookup(group);
    } catch (error) {
      if (opts.signal?.aborted) break;
      const message = (error as Error).message.slice(0, 200);
      for (const key of group) {
        results[key] = { error: message };
        if (batchSize > 1) {
          n++;
          progress.start(n, key);
        }
        progress.finish(`error: ${message}`);
      }
      if (i + batchSize < todo.length && (opts.delay ?? 0) > 0) await sleep(opts.delay ?? 0);
      continue;
    }
    for (const key of group) {
      const answer = got[key] ?? null;
      results[key] = answer;
      opts.cache.set(key, answer);
      if (batchSize > 1) {
        n++;
        progress.start(n, key);
      }
      progress.finish(outcome(answer, opts.describe));
    }
    opts.cache.save();
    if (i + batchSize < todo.length && (opts.delay ?? 0) > 0) await sleep(opts.delay ?? 0);
  }
  return results;
}
