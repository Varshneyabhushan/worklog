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
