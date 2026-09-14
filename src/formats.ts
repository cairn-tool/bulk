import type { OutputFormat } from "./types.js";

/** Every format the CLI can emit. There are no diagnostic streams here, so this is the whole set. */
export const BASE_FORMATS: readonly OutputFormat[] = ["llm", "human", "json"];

export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (BASE_FORMATS as readonly string[]).includes(value);
}
