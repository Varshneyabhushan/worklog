import { isLocalDate } from "../../utils/dates";
import type { DayNoteProps, DayProps } from ".";
import { DayInvariantError } from "./errors";

const MAX_NOTE = 20_000;

export function assertValidDate(date: string): void {
   if (!isLocalDate(date)) throw new DayInvariantError(`not a real date: ${date}`, "date", date);
}

export function assertValidNote(note: DayNoteProps): void {
   if (note.body.trim() === "") {
      throw new DayInvariantError("a note needs a body", "body", note.body);
   }
   if (note.body.length > MAX_NOTE) {
      throw new DayInvariantError(
         `a note is at most ${MAX_NOTE} characters`,
         "body",
         note.body.length,
      );
   }
}

export function assertValidDay(day: DayProps): void {
   assertValidDate(day.date);
   if ((day.summary === null) !== (day.signedOffAt === null)) {
      throw new DayInvariantError(
         "a day has a frozen summary exactly when it is signed off",
         "summary",
         day.summary,
      );
   }
   day.notes.forEach(assertValidNote);
}
