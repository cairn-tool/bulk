import { packageHomepage, packageVersion } from "../version.js";
import type { UaKind } from "./types.js";

/** A current desktop Chrome string — what most hosts expect from a client. */
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * curl's own string. Some Akamai-fronted hosts deny a browser User-Agent sent
 * from a script — and a made-up one — but serve this; see docs/sources/noaa-ir.
 */
export const CURL_UA = "curl/8.7.1";

export interface UserAgentOptions {
  contact?: string;
}

/**
 * The User-Agent for a request kind. A polite UA without a configured contact
 * degrades to the package name and homepage: Crossref then serves its public
 * pool rather than the polite one, which is slower but not broken.
 */
export function userAgentFor(kind: UaKind, opts: UserAgentOptions = {}): string {
  switch (kind) {
    case "curl":
      return CURL_UA;
    case "polite":
      return opts.contact
        ? `bulk/${packageVersion} (mailto:${opts.contact})`
        : `bulk/${packageVersion} (+${packageHomepage})`;
    default:
      return BROWSER_UA;
  }
}
