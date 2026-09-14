import { createHash } from "node:crypto";
import type { CookieJar } from "../http/cookie-jar.js";
import type { HttpClient } from "../http/types.js";
import { Solver, type SolveResult } from "./solver.js";

interface Challenge {
  rules?: { algorithm?: string; difficulty?: number };
  challenge?: { id?: string; randomData?: string };
}

/**
 * Anubis (github.com/TecharoHQ/anubis) — a page carrying `#anubis_challenge`
 * `{"rules": {"algorithm": "fast", "difficulty": D}, "challenge": {"id", "randomData"}}`.
 * The "fast" proof is a nonce for which sha256(randomData + nonce) has D leading
 * hex zeros; the nonce, hash, id and an elapsed time go to
 * `/.within.website/x/cmd/anubis/api/pass-challenge`, which sets a
 * `…-anubis-auth-*` JWT good for about an hour across the host.
 *
 * Solving a proof-of-work is a compute toll paid for the archive owner's own
 * pull at the pull's pacing; it is not applied to CAPTCHAs or credential gates.
 */
export class AnubisSolver extends Solver {
  readonly name = "anubis";
  readonly authCookie = "anubis-auth";
  readonly label = "Anubis proof-of-work";
  static readonly API = "/.within.website/x/cmd/anubis/api/pass-challenge";
  private static readonly CHALLENGE = /id="anubis_challenge"[^>]*>([\s\S]*?)<\/script>/;

  detect(text: string): boolean {
    return (
      text.slice(0, 8000).includes("anubis_challenge") ||
      text.slice(0, 2000).includes("Making sure you")
    );
  }

  /** Finds a nonce whose hash carries `difficulty` leading hex zeros. */
  static proofOfWork(
    randomData: string,
    difficulty: number,
  ): { nonce: number; hash: string; ms: number } {
    const prefix = "0".repeat(difficulty);
    const started = Date.now();
    for (let nonce = 0; ; nonce++) {
      const hash = createHash("sha256")
        .update(randomData + String(nonce))
        .digest("hex");
      if (hash.startsWith(prefix)) return { nonce, hash, ms: Date.now() - started };
    }
  }

  static parseChallenge(pageText: string): Challenge | undefined {
    const m = AnubisSolver.CHALLENGE.exec(pageText);
    if (!m) return undefined;
    try {
      return JSON.parse(m[1]) as Challenge;
    } catch {
      return undefined;
    }
  }

  protected async solve(
    http: HttpClient,
    url: string,
    pageText: string,
    host: string,
    jar: CookieJar,
    opts: { delay: number; log: (message: string) => void },
  ): Promise<SolveResult> {
    const challenge = AnubisSolver.parseChallenge(pageText);
    if (!challenge)
      return { ok: false, note: "no anubis_challenge block found; the gate may have changed" };
    const rules = challenge.rules ?? {};
    const c = challenge.challenge ?? {};
    if (rules.algorithm !== "fast")
      return { ok: false, note: `unsupported Anubis algorithm ${String(rules.algorithm)}` };
    if (!c.randomData || !c.id || rules.difficulty === undefined)
      return { ok: false, note: "incomplete Anubis challenge" };
    const { nonce, hash, ms } = AnubisSolver.proofOfWork(c.randomData, rules.difficulty);
    const query = new URLSearchParams({
      response: hash,
      nonce: String(nonce),
      redir: url,
      elapsedTime: String(Math.max(ms, 1)),
      id: c.id,
    });
    const passUrl = `${new URL(url).protocol}//${host}${AnubisSolver.API}?${query.toString()}`;
    const response = await http.request({
      url: passUrl,
      cookieJar: jar,
      redirect: "manual",
      timeoutMs: 60_000,
    });
    await response.bytes().catch(() => undefined);
    jar.save();
    if (opts.delay > 0) await new Promise((r) => setTimeout(r, opts.delay * 1000));
    const state = this.status(host).state;
    if (state === "valid" || state === "expiring") {
      opts.log(
        `  anubis: solved difficulty ${rules.difficulty} in ${ms} ms; cookie cached to ${this.jarPath(host)}`,
      );
      return { ok: true, note: `solved (nonce ${nonce})` };
    }
    return { ok: false, note: "pass-challenge did not yield an auth cookie" };
  }
}
