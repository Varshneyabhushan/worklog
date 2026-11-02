import { Day, DayNote } from "../../entities/day";
import type { DayRepository } from "../../services/day/models";
import type { LocalDate } from "../../utils/dates";
import { fromIso, placeholders, toIso, type Db } from "./database";

interface DayRow {
   date: string;
   summary: string | null;
   signed_off_at: string | null;
}

interface NoteRow {
   id: number;
   date: string;
   body: string;
   created_at: string;
}

export default class SqliteDayRepository implements DayRepository {
   constructor(private readonly db: Db) {}

   get(date: LocalDate): Day | null {
      return this.load("SELECT * FROM days WHERE date = ?", [date])[0] ?? null;
   }

   save(day: Day): Day {
      this.db.transaction(() => {
         this.db
            .prepare(
               `INSERT INTO days (date, summary, signed_off_at) VALUES (?, ?, ?)
                ON CONFLICT(date) DO UPDATE SET summary = excluded.summary,
                                                signed_off_at = excluded.signed_off_at`,
            )
            .run(day.date, day.summary, toIso(day.signedOffAt));

         const insert = this.db.prepare(
            "INSERT INTO day_notes (date, body, created_at) VALUES (?, ?, ?)",
         );
         for (const note of day.unsavedNotes) {
            insert.run(day.date, note.body, note.createdAt.toISOString());
         }
      })();
      return this.get(day.date) as Day;
   }

   list(limit: number, before: LocalDate | null): Day[] {
      return before === null
         ? this.load("SELECT * FROM days ORDER BY date DESC LIMIT ?", [limit])
         : this.load("SELECT * FROM days WHERE date < ? ORDER BY date DESC LIMIT ?", [
              before,
              limit,
           ]);
   }

   deleteNote(noteId: number): LocalDate | null {
      const row = this.db.prepare("SELECT date FROM day_notes WHERE id = ?").get(noteId) as
         { date: string } | undefined;
      if (!row) return null;
      this.db.prepare("DELETE FROM day_notes WHERE id = ?").run(noteId);
      return row.date;
   }

   signedOff(dates: LocalDate[]): LocalDate[] {
      if (dates.length === 0) return [];
      const rows = this.db
         .prepare(
            `SELECT date FROM days WHERE signed_off_at IS NOT NULL AND date IN (${placeholders(dates)})`,
         )
         .all(...dates) as { date: string }[];
      return rows.map((row) => row.date);
   }

   datesWithNotes(from: LocalDate, to: LocalDate): LocalDate[] {
      const rows = this.db
         .prepare("SELECT DISTINCT date FROM day_notes WHERE date >= ? AND date < ? ORDER BY date")
         .all(from, to) as { date: string }[];
      return rows.map((row) => row.date);
   }

   private load(sql: string, params: unknown[]): Day[] {
      const rows = this.db.prepare(sql).all(...params) as DayRow[];
      if (rows.length === 0) return [];

      const noteRows = this.db
         .prepare(`SELECT * FROM day_notes WHERE date IN (${placeholders(rows)}) ORDER BY id`)
         .all(...rows.map((row) => row.date)) as NoteRow[];

      return rows.map(
         (row) =>
            new Day({
               date: row.date,
               summary: row.summary,
               signedOffAt: fromIso(row.signed_off_at),
               notes: noteRows
                  .filter((note) => note.date === row.date)
                  .map(
                     (note) =>
                        new DayNote({
                           id: note.id,
                           body: note.body,
                           createdAt: new Date(note.created_at),
                        }),
                  ),
            }),
      );
   }
}
