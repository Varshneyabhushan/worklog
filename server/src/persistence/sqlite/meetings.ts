import { Meeting, type MeetingSource } from "../../entities/meeting";
import type { MeetingRepository, NewMeeting } from "../../services/meeting/models";
import { fromIso, toIso, type Db } from "./database";

interface MeetingRow {
   id: number;
   starts_at: string;
   ends_at: string | null;
   title: string;
   join_url: string | null;
   source: MeetingSource;
   cancelled: number;
}

export default class SqliteMeetingRepository implements MeetingRepository {
   constructor(private readonly db: Db) {}

   add(meeting: NewMeeting): Meeting {
      const { lastInsertRowid } = this.db
         .prepare(
            `INSERT INTO meetings (starts_at, ends_at, title, join_url, source, cancelled)
             VALUES (?, ?, ?, ?, ?, ?)`,
         )
         .run(
            meeting.startsAt.toISOString(),
            toIso(meeting.endsAt),
            meeting.title,
            meeting.joinUrl,
            meeting.source,
            meeting.cancelled ? 1 : 0,
         );
      return this.getById(Number(lastInsertRowid)) as Meeting;
   }

   getById(id: number): Meeting | null {
      const row = this.db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as
         MeetingRow | undefined;
      return row ? toMeeting(row) : null;
   }

   save(meeting: Meeting): Meeting {
      this.db
         .prepare(
            `UPDATE meetings SET starts_at = ?, ends_at = ?, title = ?, join_url = ?, source = ?,
                                 cancelled = ?
             WHERE id = ?`,
         )
         .run(
            meeting.startsAt.toISOString(),
            toIso(meeting.endsAt),
            meeting.title,
            meeting.joinUrl,
            meeting.source,
            meeting.cancelled ? 1 : 0,
            meeting.id,
         );
      return this.getById(meeting.id) as Meeting;
   }

   startingBetween(from: Date, to: Date): Meeting[] {
      const rows = this.db
         .prepare(
            "SELECT * FROM meetings WHERE starts_at >= ? AND starts_at < ? ORDER BY starts_at",
         )
         .all(from.toISOString(), to.toISOString()) as MeetingRow[];
      return rows.map(toMeeting);
   }

   delete(id: number): boolean {
      return this.db.prepare("DELETE FROM meetings WHERE id = ?").run(id).changes > 0;
   }
}

function toMeeting(row: MeetingRow): Meeting {
   return new Meeting({
      id: row.id,
      startsAt: new Date(row.starts_at),
      endsAt: fromIso(row.ends_at),
      title: row.title,
      joinUrl: row.join_url,
      source: row.source,
      cancelled: row.cancelled === 1,
   });
}
