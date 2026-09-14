import type { Item } from "../../plugin/types.js";
import { cleanTitle, dedupeDests, safeName } from "../../pull/naming.js";

export const API = "https://www.itu.int/mws/api/recommendations/searchRecs";

export const SERIES: Record<string, string> = {
  D: "Tariff and accounting principles and international telecommunication-ICT economic and policy issues",
  E: "Overall network operation, telephone service, service operation and human factors",
  F: "Non-telephone telecommunication services",
  G: "Transmission systems and media, digital systems and networks",
  H: "Audiovisual and multimedia systems",
  I: "Integrated services digital network",
  J: "Cable networks and transmission of television, sound programme and other multimedia signals",
  K: "Protection against interference",
  L: "Environment and ICTs, climate change, e-waste, energy efficiency; construction, installation and protection of cables and other elements of outside plant",
  M: "Telecommunication management, including TMN and network maintenance",
  N: "Maintenance: international sound programme and television transmission circuits",
  O: "Specifications of measuring equipment",
  P: "Telephone transmission quality, telephone installations, local line networks",
  Q: "Switching and signalling, and associated measurements and tests",
  R: "Telegraph transmission",
  S: "Telegraph services terminal equipment",
  T: "Terminals for telematic services",
  U: "Telegraph switching",
  V: "Data communication over the telephone network",
  X: "Data networks, open system communications and security",
  Y: "Global information infrastructure, Internet protocol aspects, next-generation networks, Internet of Things and smart cities",
  Z: "Languages and general software aspects for telecommunication systems",
};

/** The series the default run covers. */
export const HELD = "D E F G H I J M Q T V X Y Z".split(" ");

export interface ItuTRecord {
  idrec?: number | string;
  rec_name: string;
  title: string;
  approval_date?: string;
  status?: string;
  dms_link: string;
}

/** `https://www.itu.int/rec/T-REC-D.1040-202407-I!Amd1` → `T-REC-D.1040-202407-I!Amd1`. */
export const dmsId = (rec: ItuTRecord): string => rec.dms_link.split("/").pop() ?? "";

/** `ITU-T G.997.2 (2020-03) Cor.1 - title` from `G.997.2 (2020) Cor. 1 (03/2020)` and the id's yyyymm. */
export function fileName(rec: ItuTRecord): string {
  const id = dmsId(rec);
  const m = /^T-REC-(.+?)-(\d{4})(\d{2})-[A-Z]/.exec(id);
  const ym = m ? `${m[2]}-${m[3]}` : "";
  const number = m ? m[1] : rec.rec_name.split(" ")[0];
  const comp = /\b(Amd|Cor|Suppl|Err)\.?\s*(\d+)/.exec(rec.rec_name);
  const compS = comp ? ` ${comp[1]}.${comp[2]}` : "";
  return `ITU-T ${number} (${ym})${compS} - ${cleanTitle(rec.title)}`;
}

export function downloadUrl(id: string): string {
  const sep = id.includes("!") ? "!" : "!!";
  return `https://www.itu.int/rec/dologin_pub.asp?lang=e&id=${id}${sep}PDF-E&type=items`;
}

export function itemsFor(bySeries: Record<string, ItuTRecord[]>): Item[] {
  const items: Item[] = [];
  for (const [s, recs] of Object.entries(bySeries)) {
    const folder = `${s}-Series - ${SERIES[s] ?? s}`;
    for (const r of recs) {
      const id = dmsId(r);
      items.push({
        dest: `${folder}/${safeName(fileName(r))}.pdf`,
        url: downloadUrl(id),
        extra: {
          series: s,
          dms_id: id,
          rec_name: r.rec_name,
          title: r.title,
          approval_date: r.approval_date ?? "",
          status: r.status ?? "",
          idrec: r.idrec ?? null,
          list_id: r.idrec ?? id,
        },
      });
    }
  }
  dedupeDests(items);
  return items;
}
