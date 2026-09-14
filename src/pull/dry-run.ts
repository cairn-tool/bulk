import { human } from "../text/bytes.js";
import type { Item } from "./item.js";
import { Progress, type ProgressStream } from "./progress.js";

/** Print the plan in the progress format without fetching. */
export function dryRun(items: readonly Item[], stream: ProgressStream): void {
  const progress = new Progress(items.length, stream);
  items.forEach((item, i) => {
    progress.start(i + 1, item.dest);
    progress.finish(item.bytes ? human(item.bytes) : "size unknown");
  });
}
