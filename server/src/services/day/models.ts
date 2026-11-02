import type { Day } from "../../entities/day";
import type { LocalDate } from "../../utils/dates";

export interface DayRepository {
   get(date: LocalDate): Day | null;
   /** Writes the day and its unsaved notes atomically; returns it as stored, with note ids. */
   save(day: Day): Day;
   /** Days with notes or a sign-off, newest first. */
   list(limit: number, before: LocalDate | null): Day[];
   /** Returns the day the note was on, or null when there was no such note. */
   deleteNote(noteId: number): LocalDate | null;
   signedOff(dates: LocalDate[]): LocalDate[];
   datesWithNotes(from: LocalDate, to: LocalDate): LocalDate[];
}
