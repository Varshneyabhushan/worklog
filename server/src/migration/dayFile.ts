import type { LocalDate } from "../utils/dates";

export interface ParsedItem {
   text: string;
   checked: boolean;
   backlog: boolean;
   /** The `##` area above it, under `# TODOs` or `# Backlog`; null in the older free-form files. */
   area: string | null;
   /** Plain sub-bullets written under it. */
   notes: string[];
   children: ParsedItem[];
}

export interface ParsedDay {
   date: LocalDate;
   path: string;
   raw: string;
   summary: string | null;
   items: ParsedItem[];
}

const FILE_DATE = /^(\d{2})-(\d{2})-(\d{4})/;
const H1 = /^#\s+(.*?)\s*$/;
const H2 = /^##\s+(.*?)\s*$/;
const CHECKBOX = /^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const PROCEDURE = new Set(["signing in", "signing off"]);
const TASK_SECTIONS = new Set(["todos", "backlog"]);

export function dateOfFile(name: string): LocalDate | null {
   const match = FILE_DATE.exec(name);
   return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function indentOf(spaces: string): number {
   return spaces.replace(/\t/g, "  ").length;
}

export function parseDayFile(path: string, date: LocalDate, raw: string): ParsedDay {
   const items: ParsedItem[] = [];
   const summary: string[] = [];
   let section = "";
   let area: string | null = null;
   let top: { item: ParsedItem; indent: number } | null = null;
   let open: { item: ParsedItem; indent: number }[] = [];

   for (const line of raw.split(/\r?\n/)) {
      const h1 = H1.exec(line);
      if (h1) {
         section = h1[1].toLowerCase();
         area = null;
         top = null;
         open = [];
         continue;
      }
      if (section === "summary") {
         summary.push(line);
         continue;
      }
      if (PROCEDURE.has(section)) continue;

      const h2 = H2.exec(line);
      if (h2) {
         area = TASK_SECTIONS.has(section) ? h2[1] : null;
         top = null;
         open = [];
         continue;
      }

      const box = CHECKBOX.exec(line);
      if (box) {
         const indent = indentOf(box[1]);
         const item: ParsedItem = {
            text: box[3].trim(),
            checked: box[2] !== " ",
            backlog: section === "backlog",
            area,
            notes: [],
            children: [],
         };
         if (item.text === "") continue;
         if (top !== null && indent > top.indent) {
            top.item.children.push(item);
         } else {
            items.push(item);
            top = { item, indent };
         }
         open = [...open.filter((entry) => entry.indent < indent), { item, indent }];
         continue;
      }

      const bullet = BULLET.exec(line);
      if (bullet) {
         const indent = indentOf(bullet[1]);
         const owner = [...open].reverse().find((entry) => entry.indent < indent);
         owner?.item.notes.push(bullet[2].trim());
      }
   }

   const text = summary.join("\n").trim();
   return { date, path, raw, summary: text === "" || text === "…" ? null : text, items };
}
