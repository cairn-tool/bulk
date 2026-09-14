import fs from "node:fs";
import path from "node:path";
import type { CookieJar } from "../http/cookie-jar.js";
import type { HttpClient } from "../http/types.js";
import { human } from "../text/bytes.js";
import type { Item } from "./item.js";
import { Progress, StatusBar, type ProgressStream } from "./progress.js";
import { DEFAULT_LOG_NAME, TransferLog } from "./transfer-log.js";
import { fetchVerified } from "./verify.js";

export interface RunOutcome {
  ok: number;
  skip: number;
  fail: number;
  bytes: number;
  interrupted: boolean;
  seconds: number;
  logPath: string;
  failures: { dest: string; note: string; http: number }[];
}

export interface RunOptions {
  /** Seconds between downloads. */
  delay?: number;
  logName?: string;
  /** Where progress goes; silent when omitted. */
  stream?: ProgressStream;
  signal?: AbortSignal;
  jar?: (id: string) => CookieJar;
  /** Injectable for tests. */
  sleep?: (seconds: number) => Promise<void>;
}

function presentAt(file: string, expected: number | undefined): boolean {
  if (!fs.existsSync(file)) return false;
  const size = fs.statSync(file).size;
  return expected ? size === expected : size > 0;
}

/** Every destination an item could end up at — its own, and its fallbacks'. */
function destinations(item: Item): string[] {
  return [
    item.dest,
    ...(item.fallbacks ?? []).map((f) => f.dest).filter((d): d is string => Boolean(d)),
  ];
}

const silent: ProgressStream = { write: () => undefined, isTTY: false };

/**
 * Fetch every item into `destRoot` with resume, verification, logging and
 * progress — the port of the Python `pull.run()`.
 *
 * An item present at its expected size (or present and non-empty when the
 * catalogue gave none) is skipped. Each transfer is verified through a `.part`
 * file and logged; fallbacks are tried in order after a failure. Ctrl-C aborts
 * the transfer in flight, leaves no `.part` behind and returns the counts so far
 * with `interrupted` set.
 */
export async function runItems(
  http: HttpClient,
  items: readonly Item[],
  destRoot: string,
  opts: RunOptions = {},
): Promise<RunOutcome> {
  fs.mkdirSync(destRoot, { recursive: true });
  const stream = opts.stream ?? silent;
  const delay = opts.delay ?? 0;
  const sleep = opts.sleep ?? ((s: number) => new Promise<void>((r) => setTimeout(r, s * 1000)));
  const logPath = path.join(destRoot, opts.logName ?? DEFAULT_LOG_NAME);
  const progress = new Progress(items.length, stream);
  const bar = new StatusBar(stream);
  const log = new TransferLog(logPath);
  const counts = { ok: 0, skip: 0, fail: 0, bytes: 0 };
  const failures: RunOutcome["failures"] = [];
  let interrupted = false;
  const started = Date.now();

  try {
    bar.update(counts);
    for (let i = 0; i < items.length; i++) {
      if (opts.signal?.aborted) {
        interrupted = true;
        break;
      }
      const item = items[i];
      progress.start(i + 1, item.dest);
      const present = destinations(item).find((d) =>
        presentAt(path.join(destRoot, d), d === item.dest ? item.bytes : 0),
      );
      if (present) {
        progress.finish("skip (present)");
        counts.skip++;
        bar.update(counts);
        continue;
      }
      const attempts = [
        { url: item.url, dest: item.dest, request: item.request },
        ...(item.fallbacks ?? []),
      ];
      const t0 = Date.now();
      let last:
        | { status: "ok" | "fail"; note: string; http: number; bytes: number; sha256: string }
        | undefined;
      let landed = item.dest;
      for (const attempt of attempts) {
        landed = attempt.dest ?? item.dest;
        const target = path.join(destRoot, landed);
        try {
          last = await fetchVerified(
            http,
            item,
            attempt.url,
            target,
            attempt.request ?? item.request,
            {
              onProgress: (n, secs) => {
                progress.update(Progress.live(n, secs, item.bytes ?? 0));
                bar.update(counts, n);
              },
              signal: opts.signal,
              jar: opts.jar,
            },
          );
        } catch (error) {
          if (opts.signal?.aborted) {
            interrupted = true;
            break;
          }
          last = { status: "fail", note: (error as Error).message, http: 0, bytes: 0, sha256: "" };
        }
        const seconds = (Date.now() - t0) / 1000;
        log.write({
          status: last.status,
          dest: landed,
          expected: item.bytes ?? 0,
          got: last.bytes,
          sha256: last.sha256,
          seconds,
          http: last.http,
          note: last.note,
        });
        if (last.status === "ok") break;
      }
      if (interrupted) {
        progress.finish("interrupted");
        break;
      }
      const seconds = (Date.now() - t0) / 1000;
      if (last?.status === "ok") {
        counts.ok++;
        counts.bytes += last.bytes;
        progress.finish(`ok ${human(last.bytes)} ${seconds.toFixed(1)}s`);
      } else {
        counts.fail++;
        failures.push({ dest: landed, note: last?.note ?? "", http: last?.http ?? 0 });
        progress.finish(`FAIL ${last?.note ?? ""}`);
      }
      bar.update(counts);
      if (i < items.length - 1 && delay > 0) {
        // Keep the clock on the bar moving through the pause.
        for (let waited = 0; waited < delay; waited += 0.5) {
          if (opts.signal?.aborted) break;
          await sleep(Math.min(0.5, delay - waited));
          bar.update(counts);
        }
      }
    }
  } finally {
    bar.close();
    log.close();
  }
  if (opts.signal?.aborted) interrupted = true;
  const seconds = (Date.now() - started) / 1000;
  if (interrupted) stream.write("\nInterrupted.\n");
  stream.write(
    `\nok ${counts.ok}  skip ${counts.skip}  fail ${counts.fail}  ${human(counts.bytes)} in ${(seconds / 60).toFixed(1)} min  log -> ${logPath}\n`,
  );
  if (counts.fail)
    stream.write(
      "Failures are in the log; re-run the same command to retry them (present files are skipped).\n",
    );
  return { ...counts, interrupted, seconds, logPath, failures };
}

/** 130 if interrupted, 2 if anything failed, else 0. */
export function exitCodeFor(outcome: Pick<RunOutcome, "interrupted" | "fail">): 0 | 2 | 130 {
  return outcome.interrupted ? 130 : outcome.fail ? 2 : 0;
}
