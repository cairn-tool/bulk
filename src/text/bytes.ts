/** `1536` → `1.5 KB`, the way the progress line and summaries print sizes. */
export function human(n: number): string {
  let value = Number(n);
  for (const unit of ["B", "KB", "MB", "GB"] as const) {
    if (value < 1024 || unit === "GB")
      return unit === "B" ? `${value.toFixed(0)} ${unit}` : `${value.toFixed(1)} ${unit}`;
    value /= 1024;
  }
  return `${value.toFixed(1)} GB`;
}

/** Seconds → `h:mm:ss`. */
export function hms(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Byte-order comparison for stable sorting; never `localeCompare`, which is ICU- and locale-dependent. */
export function byteCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
