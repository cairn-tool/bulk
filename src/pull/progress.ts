import { human, hms } from "../text/bytes.js";

export interface ProgressStream {
  write(text: string): unknown;
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}

/** Off a terminal every line is padded to this width, so a log reads in columns. */
export const LOG_WIDTH = 120;

/**
 * Prints `[n/total] pct%  label` as an item starts, live transfer figures while
 * it runs, and its outcome right-aligned when it ends.
 *
 * On a terminal the line is rewritten in place — the right-hand text is the
 * live `pct  bytes  seconds` during the download and the outcome at the end —
 * with the label truncated with an ellipsis if the two would not fit. Off a
 * terminal there are no live updates and each line is padded to a fixed width.
 */
export class Progress {
  readonly tty: boolean;
  private prefixText = "";
  private label = "";

  constructor(
    readonly total: number,
    private readonly stream: ProgressStream,
    private readonly fixedWidth?: number,
  ) {
    this.tty = stream.isTTY === true;
  }

  private width(): number {
    if (this.fixedWidth) return this.fixedWidth;
    return this.tty ? (this.stream.columns ?? LOG_WIDTH) : LOG_WIDTH;
  }

  prefix(n: number): string {
    const pct = this.total ? (100 * n) / this.total : 100;
    return `[${n}/${this.total}] ${pct.toFixed(1)}%  `;
  }

  start(n: number, label: string): void {
    this.prefixText = this.prefix(n);
    this.label = label;
    this.stream.write(this.prefixText + label);
  }

  private line(right: string): [string, string] {
    const width = this.width();
    const room = width - this.prefixText.length - right.length - 1;
    let label = this.label;
    if (label.length > room) label = room > 1 ? label.slice(0, Math.max(room - 1, 0)) + "…" : "";
    const line = this.prefixText + label;
    const pad = Math.max(width - line.length - right.length, 1);
    return [line, " ".repeat(pad) + right];
  }

  /** The right-hand text while a transfer runs: `43.2%  4.1 MB  1.2s`, fixed width. */
  static live(bytes: number, seconds: number, expected = 0): string {
    const pct = expected ? `${((100 * bytes) / expected).toFixed(1)}%` : "?";
    return `${pct.padStart(6)}  ${human(bytes).padStart(9)}  ${seconds.toFixed(1).padStart(6)}s`;
  }

  /** One-call form for loops that report totals; on a terminal the line is rewritten in place. */
  tick(n: number, label: string, right: string): void {
    this.prefixText = this.prefix(n);
    this.label = label;
    if (this.tty) this.update(right);
    else {
      const [line, tail] = this.line(right);
      this.stream.write(line + tail + "\n");
    }
  }

  newline(): void {
    if (this.tty) this.stream.write("\n");
  }

  /** Rewrite the line with live figures on the right; a no-op off a terminal. */
  update(right: string): void {
    if (!this.tty) return;
    const [line, tail] = this.line(right);
    this.stream.write("\r\x1b[K" + line + tail);
  }

  finish(outcome: string): void {
    const [line, tail] = this.line(outcome);
    if (this.tty) this.stream.write("\r\x1b[K" + line + tail + "\n");
    else this.stream.write(tail + "\n");
  }
}

export interface StatusBarOptions {
  label?: string;
  /** What the byte count is: downloaded, hashed … */
  verb?: string;
  /** The count keys shown, in order. */
  fields?: readonly string[];
}

/**
 * A reverse-video status line pinned to the bottom of the terminal while a run
 * goes on: elapsed time, ok / skip / fail counts, bytes and average speed. The
 * scroll region is set to every row but the last so progress lines scroll above
 * it. Off a terminal it does nothing. `close()` restores the region and clears
 * the line, and callers run it in a `finally`, so Ctrl-C leaves the terminal as
 * it was.
 */
export class StatusBar {
  private tty: boolean;
  private rows = 0;
  private readonly started = Date.now();
  private readonly label: string;
  private readonly verb: string;
  private readonly fields: readonly string[];

  constructor(
    private readonly stream: ProgressStream,
    opts: StatusBarOptions = {},
  ) {
    this.tty = stream.isTTY === true;
    this.label = opts.label ?? "bulk";
    this.verb = opts.verb ?? "downloaded";
    this.fields = opts.fields ?? ["ok", "skip", "fail"];
    if (this.tty) this.reserve();
  }

  private size(): { cols: number; rows: number } {
    return { cols: this.stream.columns ?? 120, rows: this.stream.rows ?? 24 };
  }

  private reserve(): void {
    const { rows } = this.size();
    this.rows = rows;
    // A fresh line so the cursor is never on the row we reserve, then scroll region = rows 1..rows-1.
    this.stream.write(`\n\x1b7\x1b[1;${rows - 1}r\x1b8\x1b[1A`);
  }

  text(counts: Record<string, number>, inflight = 0, extra = ""): string {
    const elapsed = (Date.now() - this.started) / 1000;
    const parts = [
      `${this.label}  elapsed ${hms(elapsed)}`,
      this.fields.map((k) => `${k} ${counts[k] ?? 0}`).join("  "),
    ];
    if ("bytes" in counts) {
      const done = counts.bytes + inflight;
      const rate = elapsed > 0 ? done / elapsed : 0;
      parts.push(`${human(done)} ${this.verb}  ·  ${human(rate)}/s average`);
    }
    if (extra) parts.push(extra);
    return " " + parts.join("  ·  ") + " ";
  }

  update(counts: Record<string, number>, inflight = 0, extra = ""): void {
    if (!this.tty) return;
    const { cols, rows } = this.size();
    if (rows !== this.rows) {
      this.stream.write("\x1b[r");
      this.reserve();
    }
    const line = this.text(counts, inflight, extra).slice(0, cols).padEnd(cols);
    // Save cursor, jump to the last row, draw in reverse video, restore cursor.
    this.stream.write(`\x1b7\x1b[${rows};1H\x1b[7m${line}\x1b[0m\x1b8`);
  }

  close(): void {
    if (!this.tty) return;
    const rows = this.rows || this.size().rows;
    this.stream.write(`\x1b7\x1b[${rows};1H\x1b[K\x1b[r\x1b8`);
    this.tty = false;
  }
}
