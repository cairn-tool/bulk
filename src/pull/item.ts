import path from "node:path";
import type { UaKind } from "../http/types.js";

/** Request details for items that are not a plain GET of a plain file. */
export interface ItemRequest {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  /** A string is sent as-is (a JSON body); URLSearchParams is form-encoded. */
  body?: string | URLSearchParams;
  /** A jar id resolved by the run context — `challenge:anubis:cds.cern.ch` or `session:<plugin>`. */
  cookieJar?: string;
  userAgent?: UaKind;
}

export interface ItemFallback {
  url: string;
  /** When the fallback is a different rendering (RFC .txt for a missing .pdf). */
  dest?: string;
  request?: ItemRequest;
}

/** One thing to fetch — the port of the Python `pull.Item`. */
export interface Item {
  /** Relative to the destination root; forward slashes. */
  dest: string;
  url: string;
  /** Expected size from the catalogue; 0 or undefined when unknown (the size check is skipped). */
  bytes?: number;
  /** Override the extension's magic; null skips the magic check. */
  magic?: Uint8Array | null;
  /** Verified while the body streams; a mismatch is a failure and the file is removed. */
  digest?: { algorithm: "sha1" | "sha256"; value: string };
  /** Tried in order after the primary URL fails verification. */
  fallbacks?: readonly ItemFallback[];
  request?: ItemRequest;
  /** Everything the manifest should carry. `list_id` is what `dedupeDests` disambiguates with. */
  extra: Record<string, string | number | boolean | null>;
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** Extension → leading bytes; `null` means only the size is checked (text and media types). */
export const MAGIC: Record<string, Uint8Array | null> = {
  ".pdf": enc("%PDF-"),
  ".zip": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ".gz": new Uint8Array([0x1f, 0x8b]),
  ".png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  ".gif": enc("GIF8"),
  ".jpg": new Uint8Array([0xff, 0xd8, 0xff]),
  ".jpeg": new Uint8Array([0xff, 0xd8, 0xff]),
  ".wav": enc("RIFF"),
  ".xlsx": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ".docx": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ".pptx": new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ".doc": new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]),
  ".xls": new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]),
  ".ppt": new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]),
  ".mp4": null,
  ".mp3": null,
  ".csv": null,
  ".txt": null,
  ".kml": null,
  ".json": null,
  ".xml": null,
  ".tif": null,
  ".tiff": null,
  ".html": null,
};

/** The magic an item is checked against: its own override, else its extension's, else nothing. */
export function magicFor(item: Pick<Item, "dest" | "magic">): Uint8Array | null {
  if (item.magic !== undefined) return item.magic;
  return MAGIC[path.extname(item.dest).toLowerCase()] ?? null;
}

export function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false;
  return true;
}
