import { loadJson, saveJson } from "../text/json-file.js";

export type QueryRecord = Record<string, unknown>;
export type QueryAnswer = QueryRecord | null;

/**
 * The JSON cache behind a lookup: `{ "<normalised key>": record | null }`. A
 * miss is cached as `null` so a re-run costs no request for a key the service
 * has already said it does not know; an error is never cached.
 */
export class QueryCache {
  private entries: Record<string, QueryAnswer>;

  constructor(readonly file?: string) {
    this.entries = file ? loadJson<Record<string, QueryAnswer>>(file, {}) : {};
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.entries, key);
  }

  get(key: string): QueryAnswer | undefined {
    return this.has(key) ? this.entries[key] : undefined;
  }

  set(key: string, answer: QueryAnswer): void {
    this.entries[key] = answer;
  }

  size(): number {
    return Object.keys(this.entries).length;
  }

  save(): void {
    if (this.file) saveJson(this.file, this.entries, 0);
  }
}
