/** A calendar date as `YYYY-MM-DD`; sorts correctly as a string. */
export type LocalDate = string;

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isLocalDate(value: string): boolean {
   if (!LOCAL_DATE.test(value)) return false;
   const date = new Date(`${value}T00:00:00Z`);
   return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function localDateOf(instant: Date, timeZone: string): LocalDate {
   // the en-CA locale formats dates as YYYY-MM-DD
   return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).format(instant);
}

export function localTimeOf(instant: Date, timeZone: string): string {
   return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
   }).format(instant);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
   return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function addDays(date: LocalDate, days: number): LocalDate {
   const next = new Date(`${date}T00:00:00Z`);
   next.setUTCDate(next.getUTCDate() + days);
   return next.toISOString().slice(0, 10);
}

function offsetMs(instant: Date, timeZone: string): number {
   const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
   }).formatToParts(instant);
   const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
   const asUtc = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
   );
   return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

export function startOfDay(date: LocalDate, timeZone: string): Date {
   const midnightUtc = Date.parse(`${date}T00:00:00Z`);
   // a second pass settles days where the offset changes (DST) near midnight
   const guess = midnightUtc - offsetMs(new Date(midnightUtc), timeZone);
   return new Date(midnightUtc - offsetMs(new Date(guess), timeZone));
}

export function dayRange(date: LocalDate, timeZone: string): { from: Date; to: Date } {
   return { from: startOfDay(date, timeZone), to: startOfDay(addDays(date, 1), timeZone) };
}
