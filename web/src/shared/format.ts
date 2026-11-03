import type { Task, TaskStatus } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const STATUS_LABELS: Record<TaskStatus, string> = {
   backlog: "Backlog",
   picked: "Picked",
   in_review: "In review",
   done: "Done",
   dropped: "Dropped",
};

/** "2026-11-03" or an instant → "03-11", the worklog's own date format. */
export function shortDate(value: string, timeZone?: string): string {
   const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDate(value, timeZone);
   const [, month, day] = date.split("-");
   return `${day}-${month}`;
}

export function localDate(instant: string, timeZone?: string): string {
   return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(instant));
}

export function localTime(instant: string, timeZone?: string): string {
   return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
   }).format(new Date(instant));
}

/** "2026-11-03" → "Tuesday, 3 November". */
export function longDay(date: string): string {
   const part = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
         new Date(`${date}T00:00:00Z`),
      );
   return `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })}`;
}

/** Time since an instant, coarsely: "40m", "5h", "3d". */
export function age(since: string, now: Date): string {
   const elapsed = Math.max(0, now.getTime() - new Date(since).getTime());
   if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
   if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
   return `${Math.floor(elapsed / DAY)}d`;
}

/** The short ticket or PR reference a task is known by: "FDE-447", "worklog#31". */
export function chip(task: Task): string | null {
   if (task.sourceKey === null) return null;
   const ref = task.sourceKey.slice(task.sourceKey.indexOf(":") + 1);
   if (task.sourceKey.startsWith("gh:")) return ref.slice(ref.indexOf("/") + 1);
   if (task.sourceKey.startsWith("linear:")) return ref;
   return null;
}

export function isOverdue(task: Task, today: string): boolean {
   return task.due !== null && task.due < today && task.isOpen;
}
