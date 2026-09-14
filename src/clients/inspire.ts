import type { HttpClient } from "../http/types.js";

export const INSPIRE = "https://inspirehep.net/api/literature";

export interface InspireDocument {
  url?: string;
  key?: string;
  filename?: string;
}

/**
 * The fulltext URLs INSPIRE holds for a CERN record, looked up by INSPIRE id,
 * then CDS id, then report number — the no-solve fallback for CDS files.
 */
export async function inspireFiles(
  http: HttpClient,
  ids: { inspire?: string; record: string; reportNumber?: string },
  opts: { signal?: AbortSignal; sleep?: (s: number) => Promise<void>; delay?: number } = {},
): Promise<{ controlNumber: string | null; documents: InspireDocument[] }> {
  const queries: string[] = [];
  if (ids.inspire) queries.push(`recid:${ids.inspire}`);
  queries.push(`external_system_identifiers.value:${ids.record}`);
  if (ids.reportNumber) queries.push(`reportnumber:${ids.reportNumber}`);
  for (const q of queries) {
    const params = new URLSearchParams({
      q,
      fields: "documents,report_numbers,control_number",
      size: "2",
    });
    const response = await http.request({
      url: `${INSPIRE}?${params}`,
      accept: "application/json",
      timeoutMs: 60_000,
      signal: opts.signal,
    });
    if (opts.delay && opts.sleep) await opts.sleep(opts.delay);
    if (response.status !== 200) continue;
    let hits: { metadata?: { documents?: InspireDocument[]; control_number?: number | string } }[];
    try {
      hits = (await response.json<{ hits?: { hits?: typeof hits } }>()).hits?.hits ?? [];
    } catch {
      continue;
    }
    for (const h of hits) {
      const docs = (h.metadata?.documents ?? []).filter((d) => d.url);
      if (docs.length)
        return {
          controlNumber:
            h.metadata?.control_number === undefined ? null : String(h.metadata.control_number),
          documents: docs,
        };
    }
  }
  return { controlNumber: null, documents: [] };
}
