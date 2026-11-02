import { canTransition, isOpen, type TaskLink, type TaskStatus } from "../entities/task";
import { startOfDay, type LocalDate } from "../utils/dates";
import type { ParsedDay, ParsedItem } from "./dayFile";
import { identityOf, isMeetingLine, linksOf, meaningOf, meetingMinutes, tagOf } from "./lines";

export interface PlannedFields {
   title: string;
   description: string;
   blockedOn: string | null;
   tags: string[];
   links: TaskLink[];
   parentKey: string | null;
   importedFrom: string;
}

export type TaskOp =
   | { kind: "create"; key: string; at: Date; status: TaskStatus; fields: PlannedFields }
   | { kind: "move"; key: string; at: Date; status: TaskStatus }
   | {
        kind: "edit";
        key: string;
        at: Date;
        changes: { title?: string; blockedOn?: string | null; tags?: string[]; links?: TaskLink[] };
     };

export interface PlannedMeeting {
   date: LocalDate;
   startsAt: Date;
   title: string;
   joinUrl: string | null;
   cancelled: boolean;
}

export interface PlannedDay {
   date: LocalDate;
   notes: string[];
   summary: string;
   signedOffAt: Date;
}

export interface PlannedTaskSummary {
   key: string;
   title: string;
   status: TaskStatus;
   blockedOn: string | null;
   tags: string[];
   parentKey: string | null;
   firstSeen: LocalDate;
   lastSeen: LocalDate;
   daysSeen: number;
}

export interface ImportPlan {
   ops: TaskOp[];
   tasks: PlannedTaskSummary[];
   meetings: PlannedMeeting[];
   days: PlannedDay[];
   lastDate: LocalDate | null;
}

interface Tracked {
   key: string;
   identity: string;
   firstUrl: string | null;
   parent: Tracked | null;
   children: Tracked[];
   status: TaskStatus;
   title: string;
   blockedOn: string | null;
   tags: string[];
   links: TaskLink[];
   firstSeen: LocalDate;
   lastSeen: LocalDate;
   daysSeen: number;
}

const MAX_NOTE = 19_000;
const MAX_DESCRIPTION = 19_000;
const PREFIX_MIN = 20;
const MIDDAY_MS = 12 * 60 * 60 * 1000;

const shortDate = (date: LocalDate) => date.split("-").reverse().join("-");

/** Rebuilds tasks, meetings and days from the parsed day files, as operations in time order. */
export function planImport(parsed: ParsedDay[], timeZone: string): ImportPlan {
   const files = [...parsed].sort(
      (a, b) => a.date.localeCompare(b.date) || a.path.localeCompare(b.path),
   );
   const ops: TaskOp[] = [];
   const all: Tracked[] = [];
   const meetings = new Map<string, PlannedMeeting>();
   let prevSeen = new Set<Tracked>();

   for (const day of files) {
      const base = startOfDay(day.date, timeZone).getTime() + MIDDAY_MS;
      let tick = 0;
      const next = () => new Date(base + tick++ * 1000);
      const seenToday = new Set<Tracked>();

      const handle = (item: ParsedItem, parent: Tracked | null) => {
         if (parent === null && isMeetingLine(item.text)) {
            const minutes = meetingMinutes(item.text);
            if (minutes !== null) {
               const { title, dropped } = meaningOf(item.text);
               const key = `${day.date}|${minutes}|${identityOf(title)}`;
               if (!meetings.has(key)) {
                  meetings.set(key, {
                     date: day.date,
                     startsAt: new Date(
                        startOfDay(day.date, timeZone).getTime() + minutes * 60_000,
                     ),
                     title,
                     joinUrl:
                        linksOf(item.text).find((link) => link.kind === "meeting")?.url ??
                        linksOf(item.text)[0]?.url ??
                        null,
                     cancelled: dropped,
                  });
               }
               for (const child of item.children) handle(child, null);
               return;
            }
         }

         const meaning = meaningOf(item.text);
         const identity = identityOf(meaning.title);
         const links = linksOf(item.text);
         const tag = tagOf(item.area);
         const status: TaskStatus = item.checked
            ? "done"
            : meaning.dropped
              ? "dropped"
              : item.backlog || meaning.postponed
                ? "backlog"
                : "picked";

         const pool = parent ? parent.children : all.filter((task) => task.parent === null);
         let task = match(pool, identity, links[0]?.url ?? null, prevSeen, seenToday);

         if (task === null) {
            task = {
               key: `T${all.length + 1}`,
               identity,
               firstUrl: links[0]?.url ?? null,
               parent,
               children: [],
               status,
               title: meaning.title,
               blockedOn: isOpen(status) ? meaning.blockedOn : null,
               tags: tag ? [tag] : [],
               links,
               firstSeen: day.date,
               lastSeen: day.date,
               daysSeen: 0,
            };
            all.push(task);
            parent?.children.push(task);
            const description = [
               `Imported from ${day.path} (first seen ${shortDate(day.date)}).`,
               "",
               item.text,
               ...item.notes.map((note) => `- ${note}`),
            ]
               .join("\n")
               .slice(0, MAX_DESCRIPTION);
            ops.push({
               kind: "create",
               key: task.key,
               at: next(),
               status,
               fields: {
                  title: task.title,
                  description,
                  blockedOn: task.blockedOn,
                  tags: task.tags,
                  links,
                  parentKey: parent?.key ?? null,
                  importedFrom: day.path,
               },
            });
         } else {
            task.identity = identity;
            const changes: Extract<TaskOp, { kind: "edit" }>["changes"] = {};
            if (meaning.title !== task.title) changes.title = task.title = meaning.title;
            if (tag && !(task.tags.length === 1 && task.tags[0] === tag))
               changes.tags = task.tags = [tag];
            if (links.length > 0 && JSON.stringify(links) !== JSON.stringify(task.links)) {
               changes.links = task.links = links;
            }
            if (Object.keys(changes).length > 0)
               ops.push({ kind: "edit", key: task.key, at: next(), changes });

            for (const step of pathTo(task.status, status)) {
               ops.push({ kind: "move", key: task.key, at: next(), status: step });
               task.status = step;
            }
            const blockedOn = isOpen(task.status) ? meaning.blockedOn : task.blockedOn;
            if (blockedOn !== task.blockedOn) {
               ops.push({ kind: "edit", key: task.key, at: next(), changes: { blockedOn } });
               task.blockedOn = blockedOn;
            }
         }

         task.lastSeen = day.date;
         task.daysSeen += 1;
         seenToday.add(task);
         for (const child of item.children) handle(child, task);
      };

      for (const item of day.items) handle(item, null);

      // a file with no checkboxes at all is not a carry-over day, so nothing "vanished" on it
      if (day.items.length > 0) {
         for (const task of prevSeen) {
            if (!seenToday.has(task) && isOpen(task.status)) {
               ops.push({ kind: "move", key: task.key, at: next(), status: "dropped" });
               task.status = "dropped";
            }
         }
         prevSeen = seenToday;
      }
   }

   return {
      ops,
      tasks: all.map((task) => ({
         key: task.key,
         title: task.title,
         status: task.status,
         blockedOn: task.blockedOn,
         tags: task.tags,
         parentKey: task.parent?.key ?? null,
         firstSeen: task.firstSeen,
         lastSeen: task.lastSeen,
         daysSeen: task.daysSeen,
      })),
      meetings: [...meetings.values()],
      days: planDays(files, timeZone),
      lastDate: files.at(-1)?.date ?? null,
   };
}

function match(
   pool: Tracked[],
   identity: string,
   firstUrl: string | null,
   prevSeen: Set<Tracked>,
   seenToday: Set<Tracked>,
): Tracked | null {
   const free = pool.filter((task) => !seenToday.has(task));
   const carried = free.filter((task) => prevSeen.has(task));

   const exact =
      carried.find((task) => task.identity === identity) ??
      [...free].reverse().find((task) => task.identity === identity);
   if (exact) return exact;

   const grown = carried.find((task) => {
      const [short, long] =
         task.identity.length <= identity.length
            ? [task.identity, identity]
            : [identity, task.identity];
      return short.length >= PREFIX_MIN && long.startsWith(short);
   });
   if (grown) return grown;

   if (firstUrl !== null) return carried.find((task) => task.firstUrl === firstUrl) ?? null;
   return null;
}

/** The moves that take a task from one status to another, via picked when the table has no direct move. */
function pathTo(from: TaskStatus, to: TaskStatus): TaskStatus[] {
   if (from === to) return [];
   if (canTransition(from, to)) return [to];
   return ["picked", to];
}

function planDays(files: ParsedDay[], timeZone: string): PlannedDay[] {
   const byDate = new Map<LocalDate, ParsedDay[]>();
   for (const file of files) byDate.set(file.date, [...(byDate.get(file.date) ?? []), file]);

   return [...byDate.entries()].map(([date, sameDay]) => {
      const notes = sameDay.flatMap((file) =>
         chunk(`Imported from ${file.path}.\n\n${file.raw.trim()}`),
      );
      const summaries = sameDay
         .map((file) => file.summary)
         .filter((text): text is string => text !== null);
      return {
         date,
         notes,
         summary: summaries.length > 0 ? summaries.join("\n\n") : "…",
         signedOffAt: new Date(startOfDay(date, timeZone).getTime() + 23 * 60 * 60 * 1000),
      };
   });
}

function chunk(text: string): string[] {
   if (text.length <= MAX_NOTE) return [text];
   const parts: string[] = [];
   let current = "";
   for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > MAX_NOTE && current !== "") {
         parts.push(current);
         current = "";
      }
      current += (current === "" ? "" : "\n") + line.slice(0, MAX_NOTE);
   }
   if (current !== "") parts.push(current);
   return parts.map((part, i) =>
      parts.length > 1 ? `(part ${i + 1} of ${parts.length})\n${part}` : part,
   );
}
