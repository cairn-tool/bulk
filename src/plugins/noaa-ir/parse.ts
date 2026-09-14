import type { Item } from "../../plugin/types.js";
import { cleanTitle, safeName } from "../../pull/naming.js";

export const BASE = "https://repository.library.noaa.gov";

export type NoaaDoc = Record<string, unknown>;

export function first(v: unknown): string {
  if (Array.isArray(v)) return v.length ? String(v[0]) : "";
  return v === undefined || v === null ? "" : String(v);
}

export function itemsFor(
  docs: readonly NoaaDoc[],
  collection: string,
  types: readonly string[] | undefined,
): Item[] {
  const wanted = types?.length ? new Set(types.map((t) => t.toLowerCase())) : undefined;
  const items: Item[] = [];
  for (const d of docs) {
    const pid = String(d.PID ?? "");
    const num = pid.split(":").pop() ?? "";
    const label = String(d["DS1.label_txt_en"] ?? "");
    if (!label || !("DS1.filesize_tl" in d)) continue; // a record with no attached file
    const rtype = first(d["mods.type_of_resource"]);
    if (wanted && !wanted.has(rtype.toLowerCase())) continue;
    const dot = label.lastIndexOf(".");
    const ext = (dot === -1 ? "" : label.slice(dot).toLowerCase()) || ".pdf";
    const title = cleanTitle(String(d["mods.title"] ?? first(d["dc.title"])));
    const year =
      String(d["mods.ss_publishyear"] ?? first(d["mods.raw_date"]) ?? "").slice(0, 4) || "undated";
    const sha = String(d["DS1.checksumsha256_txt_en"] ?? "").replace("urn:sha256:", "");
    items.push({
      dest: `${collection}/${year}/${safeName(`${num} - ${title}`)}${ext}`,
      url: `${BASE}/view/noaa/${num}/noaa_${num}_DS1${ext}`,
      bytes: Number(first(d["DS1.filesize_tl"])) || 0,
      digest: sha ? { algorithm: "sha256", value: sha } : undefined,
      extra: {
        pid,
        collection,
        title,
        year,
        type: rtype,
        corp: ((d["mods.sm_localcorpname"] as string[] | undefined) ?? []).join("; "),
        added: String(d["fgs.createdDate"] ?? "").slice(0, 10),
        sha256: sha,
        file_label: label,
        doi: first(d["mods.sm_digital_object_identifier"]),
        list_id: num,
      },
    });
  }
  return items;
}
