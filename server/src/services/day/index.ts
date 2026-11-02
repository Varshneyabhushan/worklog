import { Day } from "../../entities/day";
import { assertValidDate, assertValidDay } from "../../entities/day/validation";
import type { LocalDate } from "../../utils/dates";
import { DayNoteNotFoundError } from "./errors";
import type { DayRepository } from "./models";

export * from "./errors";

export class DayService {
   constructor(private readonly repo: DayRepository) {}

   /** The stored day, or an open one when nothing has been saved for that date yet. */
   get(date: LocalDate): Day {
      assertValidDate(date);
      return this.repo.get(date) ?? Day.open(date);
   }

   addNote(date: LocalDate, body: string, at: Date): Day {
      return this.write(this.get(date).addNote(body, at));
   }

   signOff(date: LocalDate, summary: string, at: Date): Day {
      return this.write(this.get(date).signOff(summary, at));
   }

   deleteNote(noteId: number): LocalDate {
      const date = this.repo.deleteNote(noteId);
      if (date === null) throw new DayNoteNotFoundError(noteId);
      return date;
   }

   list(limit: number, before: LocalDate | null): Day[] {
      return this.repo.list(limit, before);
   }

   signedOff(dates: LocalDate[]): LocalDate[] {
      return this.repo.signedOff(dates);
   }

   datesWithNotes(from: LocalDate, to: LocalDate): LocalDate[] {
      return this.repo.datesWithNotes(from, to);
   }

   private write(day: Day): Day {
      assertValidDay(day);
      return this.repo.save(day);
   }
}
